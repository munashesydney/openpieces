import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhooks, webhookDeliveries } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/security/encryption";
import { enqueueWebhookDelivery } from "@/lib/queues/pg-boss";
import { randomBytes } from "crypto";
import { isValidUuid } from "@/lib/utils/uuid";

export async function createWebhook(
  workspaceId: string,
  url: string,
  events: string[]
) {
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const secretEncrypted = encryptSecret(secret);

  const [webhook] = await db
    .insert(webhooks)
    .values({
      workspaceId,
      url,
      secretEncrypted,
      events,
    })
    .returning();

  return { webhook, secret };
}

export async function getWebhooks(workspaceId: string) {
  if (!isValidUuid(workspaceId)) return [];

  return await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.workspaceId, workspaceId))
    .orderBy(webhooks.createdAt);
}

export async function deleteWebhook(workspaceId: string, webhookId: string) {
  if (!isValidUuid(workspaceId) || !isValidUuid(webhookId)) return null;

  const [deleted] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, workspaceId)))
    .returning();

  return deleted ?? null;
}

export async function toggleWebhook(workspaceId: string, webhookId: string, isActive: boolean) {
  if (!isValidUuid(workspaceId) || !isValidUuid(webhookId)) return null;

  const [updated] = await db
    .update(webhooks)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, workspaceId)))
    .returning();

  return updated ?? null;
}

export async function dispatchWebhookEvent(
  workspaceId: string,
  eventName: string,
  payload: any
) {
  if (!isValidUuid(workspaceId)) return;

  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.workspaceId, workspaceId),
        eq(webhooks.isActive, true)
      )
    );

  const matchedWebhooks = activeWebhooks.filter(
    (wh) => wh.events.includes(eventName) || wh.events.includes("*")
  );

  for (const webhook of matchedWebhooks) {
    await enqueueWebhookDelivery({
      webhookId: webhook.id,
      workspaceId,
      eventName,
      payload,
    });
  }
}
