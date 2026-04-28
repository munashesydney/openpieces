import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceSettings } from "@/lib/db/schema";
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return settings;
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
