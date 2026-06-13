import { getPgBoss, WEBHOOK_DELIVERY_QUEUE, PG_BOSS_CONCURRENCY, type WebhookDeliveryJob } from "@/lib/queues/pg-boss";
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
        } catch (error: any) {
          success = false;
          responseBody = error.message;
          throw error; // Let pg-boss handle retries
        } finally {
          const completedAt = new Date();
          // Record delivery attempt for future observability feature
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
          });
        }
      }
    }
  );

  return boss;
}
