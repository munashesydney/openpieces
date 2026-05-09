import { eq, and, count, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aiChats,
  workspaceSettings,
  type WorkspaceSettings,
} from "@/lib/db/schema";
import { isValidUuid } from "@/lib/utils/uuid";

export async function getWorkspaceSettings(workspaceId: string) {
  if (!isValidUuid(workspaceId)) return null;

  const [settings] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1);

  if (!settings) {
    // Return default implicitly if no record found
    return {
      workspaceId,
      defaultModel: "deepseek/deepseek-v3.2",
      timezone: "UTC",
      dailyChatLimit: 100,
      chatLimitResetAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return settings;
}

/**
 * Get the daily chat limit status for a workspace.
 * Returns the number of chats used today (or since the last manual reset),
 * the configured limit, and whether the workspace is over it.
 */
export async function getWorkspaceChatLimitInfo(workspaceId: string) {
  const settings = await getWorkspaceSettings(workspaceId);
  const limit = settings?.dailyChatLimit ?? 100;

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const countFrom =
    settings?.chatLimitResetAt && settings.chatLimitResetAt > startOfToday
      ? settings.chatLimitResetAt
      : startOfToday;

  const [{ count: used }] = await db
    .select({ count: count() })
    .from(aiChats)
    .where(
      and(
        eq(aiChats.workspaceId, workspaceId),
        gte(aiChats.createdAt, countFrom),
      ),
    );

  return {
    used,
    limit,
    isOverLimit: limit > 0 && used >= limit,
    countFrom,
  };
}

export async function updateWorkspaceDefaultModel(
  workspaceId: string,
  defaultModel: string,
) {
  if (!isValidUuid(workspaceId)) return null;

  const [settings] = await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      defaultModel,
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { defaultModel, updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export async function resetWorkspaceChatLimit(
  workspaceId: string,
): Promise<WorkspaceSettings | null> {
  if (!isValidUuid(workspaceId)) return null;

  const [settings] = await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      chatLimitResetAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { chatLimitResetAt: new Date(), updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export async function updateWorkspaceChatLimit(
  workspaceId: string,
  dailyChatLimit: number,
) {
  if (!isValidUuid(workspaceId)) return null;

  const [settings] = await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      dailyChatLimit,
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { dailyChatLimit, updatedAt: new Date() },
    })
    .returning();

  return settings;
}

export async function updateWorkspaceTimezone(
  workspaceId: string,
  timezone: string,
) {
  if (!isValidUuid(workspaceId)) return null;

  const [settings] = await db
    .insert(workspaceSettings)
    .values({
      workspaceId,
      timezone,
    })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { timezone, updatedAt: new Date() },
    })
    .returning();

  return settings;
}
