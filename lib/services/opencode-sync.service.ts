import { db } from "@/lib/db";
import { opencodeSessions, services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMessages } from "./opencode.service";
import { recordAiUsage } from "./ai-usage.service";

export async function syncOpenCodeUsage(sessionId: string) {
  const [sessionRecord] = await db
    .select({
      serviceId: opencodeSessions.serviceId,
      lastUsageSyncAt: opencodeSessions.lastUsageSyncAt,
    })
    .from(opencodeSessions)
    .where(eq(opencodeSessions.sessionId, sessionId))
    .limit(1);

  if (!sessionRecord) return;

  const [service] = await db
    .select({ workspaceId: services.workspaceId })
    .from(services)
    .where(eq(services.id, sessionRecord.serviceId))
    .limit(1);

  if (!service) return;

  try {
    const messages = await getMessages(sessionId);
    let latestSyncAt = sessionRecord.lastUsageSyncAt;
    let hasNewUsage = false;

    for (const message of messages) {
      // OpenCode messages use 'timestamp' or 'created_at' depending on API version, assuming 'created_at' or 'timestamp'
      const msgTimestamp = message.timestamp || message.created_at;
      if (!msgTimestamp) continue;
      
      const msgDate = new Date(msgTimestamp);
      if (sessionRecord.lastUsageSyncAt && msgDate <= sessionRecord.lastUsageSyncAt) {
        continue;
      }

      if (message.role === "assistant" && message.cost && message.cost > 0) {
        const tokens = message.tokens || { input: 0, output: 0, total: 0 };
        
        await recordAiUsage({
          workspaceId: service.workspaceId,
          opencodeSessionId: sessionId,
          messageId: null, // We don't have an openpieces aiMessage id for opencode messages
          agentType: "opencode",
          model: "opencode",
          promptTokens: tokens.input || 0,
          completionTokens: tokens.output || 0,
          totalTokens: tokens.total || 0,
          cost: message.cost,
        });
        hasNewUsage = true;
      }

      if (!latestSyncAt || msgDate > latestSyncAt) {
        latestSyncAt = msgDate;
      }
    }

    if (hasNewUsage || latestSyncAt !== sessionRecord.lastUsageSyncAt) {
      await db
        .update(opencodeSessions)
        .set({ lastUsageSyncAt: latestSyncAt || new Date() })
        .where(eq(opencodeSessions.sessionId, sessionId));
    }
  } catch (error) {
    console.error(`Failed to sync OpenCode usage for session ${sessionId}:`, error);
  }
}

export async function syncAllWorkspaceOpenCodeUsage(workspaceId: string) {
  // Find all OpenCode sessions for this workspace
  const sessions = await db
    .select({ sessionId: opencodeSessions.sessionId })
    .from(opencodeSessions)
    .innerJoin(services, eq(opencodeSessions.serviceId, services.id))
    .where(eq(services.workspaceId, workspaceId));

  const promises = sessions.map((s) => syncOpenCodeUsage(s.sessionId));
  await Promise.allSettled(promises);
}
