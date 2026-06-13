import { getPgBoss, WEBHOOK_DELIVERY_QUEUE, PG_BOSS_CONCURRENCY, type WebhookDeliveryJob, enqueueWebhookDelivery } from "@/lib/queues/pg-boss";
import { db } from "@/lib/db";
import { webhooks, webhookDeliveries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptSecret } from "@/lib/security/encryption";
import { createHmac } from "crypto";

function signPayload(secret: string, payloadStr: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payloadStr);
  return hmac.digest("hex");
}

export async function startWebhookWorker() {
  const boss = await getPgBoss();

  boss.on("error", (error) => {
    console.error("[webhook-worker] pg-boss error:", error);
  });

  await boss.work(
    WEBHOOK_DELIVERY_QUEUE,
    { localConcurrency: PG_BOSS_CONCURRENCY },
    async (jobs) => {
      for (const job of jobs) {
        const startedAt = new Date();
        const data = job.data as WebhookDeliveryJob;
        const attempt = data.attempt || 1;

        const [webhook] = await db
          .select()
          .from(webhooks)
          .where(
            and(
              eq(webhooks.id, data.webhookId),
              eq(webhooks.workspaceId, data.workspaceId)
            )
          )
          .limit(1);

        if (!webhook) {
          console.warn(`[webhook-worker] Webhook ${data.webhookId} not found for job ${job.id}`);
          continue;
        }

        const secret = decryptSecret(webhook.secretEncrypted);
        const body = {
          event: data.eventName,
          timestamp: new Date().toISOString(),
          data: data.payload,
        };
        const payloadStr = JSON.stringify(body);
        const signature = signPayload(secret, payloadStr);

        let success = false;
        let responseStatus: number | null = null;
        let responseBody: string | null = null;
        let status = "success";
        let retryAt: Date | null = null;

        try {
          const res = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-OP-Signature": signature,
              "X-OP-Event": data.eventName,
              "User-Agent": "OpenPieces-Webhook/1.0",
            },
            body: payloadStr,
          });

          responseStatus = res.status;
          success = res.ok;
          try {
            responseBody = await res.text();
            if (responseBody.length > 1000) {
              responseBody = responseBody.slice(0, 1000) + "... [truncated]";
            }
          } catch {
            responseBody = "[Error reading body]";
          }

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${responseBody}`);
          }
          status = "success";
        } catch (error: any) {
          success = false;
          responseBody = error.message || "Unknown error";
          
          // Custom backoff intervals in seconds: 5m, 30m, 2h, 5h, 10h
          const RETRY_DELAYS_SEC = [5 * 60, 30 * 60, 2 * 60 * 60, 5 * 60 * 60, 10 * 60 * 60];
          
          if (attempt <= RETRY_DELAYS_SEC.length) {
            const delaySec = RETRY_DELAYS_SEC[attempt - 1];
            retryAt = new Date(Date.now() + delaySec * 1000);
            status = "retrying";

            // Enqueue retry job
            await enqueueWebhookDelivery(
              {
                webhookId: data.webhookId,
                workspaceId: data.workspaceId,
                eventName: data.eventName,
                payload: data.payload,
                attempt: attempt + 1,
              },
              { startAfter: delaySec }
            );
            console.log(`[webhook-worker] Webhook ${data.webhookId} failed. Scheduled attempt ${attempt + 1} in ${delaySec}s.`);
          } else {
            status = "failed";
            console.log(`[webhook-worker] Webhook ${data.webhookId} failed after max attempts.`);
          }
        } finally {
          const completedAt = new Date();
          // Record delivery attempt for observablity feature
          await db.insert(webhookDeliveries).values({
            webhookId: webhook.id,
            workspaceId: webhook.workspaceId,
            eventName: data.eventName,
            payload: data.payload,
            responseStatus,
            responseBody,
            success,
            startedAt,
            completedAt,
            attempt,
            status,
            retryAt,
          });
        }
      }
    }
  );

  return boss;
}
