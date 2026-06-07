"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getActivityLogsByType, getActivityLogById } from "@/lib/services/activity.service";
import {
  getBrainSettings,
  updateBrainSettings,
  getBrainEntries,
  getBrainStats,
  triggerBrainIngestion,
  triggerBrainReinforcement,
} from "@/lib/services/brain.service";
import type { ActivityLog } from "@/lib/db/schema";

export async function getActivityByTypeAction(
  workspaceId: string,
  recordType: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityLog[]> {
  await requireWorkspaceOwner(workspaceId);
  return getActivityLogsByType(workspaceId, recordType, limit, offset);
}

export async function getActivityByIdAction(
  workspaceId: string,
  activityId: string
): Promise<ActivityLog | null> {
  await requireWorkspaceOwner(workspaceId);
  return getActivityLogById(activityId, workspaceId);
}

// Brain-related actions

export type ActionResult = { error: string } | { success: true };

export async function getBrainSettingsAction(workspaceId: string) {
  await requireWorkspaceOwner(workspaceId);
  return await getBrainSettings(workspaceId);
}

export async function updateBrainSettingsAction(
  workspaceId: string,
  settings: {
    ingestionEnabled?: boolean;
    ingestionIntervalMinutes?: number;
    reinforcementEnabled?: boolean;
    reinforcementIntervalHours?: number;
  }
): Promise<{ error: string } | { success: true; settings: Awaited<ReturnType<typeof updateBrainSettings>> }> {
  await requireWorkspaceOwner(workspaceId);

  try {
    const updated = await updateBrainSettings(workspaceId, settings);
    if (!updated) {
      return { error: "Failed to update settings" };
    }
    revalidatePath(`/workspace/${workspaceId}/brain`);
    return { success: true, settings: updated };
  } catch (err) {
    console.error("Unexpected error updating brain settings:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function getBrainEntriesAction(
  workspaceId: string,
  page: number = 1
) {
  await requireWorkspaceOwner(workspaceId);
  return await getBrainEntries(workspaceId, page, 20);
}

export async function getBrainStatsAction(workspaceId: string) {
  await requireWorkspaceOwner(workspaceId);
  return await getBrainStats(workspaceId);
}

export async function triggerBrainIngestionAction(workspaceId: string): Promise<
  { error: string } | { processed: number; chatId: string; message: string }
> {
  await requireWorkspaceOwner(workspaceId);
  try {
    return await triggerBrainIngestion(workspaceId);
  } catch (err) {
    console.error("Failed to trigger brain ingestion:", err);
    return { error: "Failed to trigger ingestion" };
  }
}

export async function triggerBrainReinforcementAction(workspaceId: string): Promise<
  { error: string } | { chatId: string; message: string }
> {
  await requireWorkspaceOwner(workspaceId);
  try {
    return await triggerBrainReinforcement(workspaceId);
  } catch (err) {
    console.error("Failed to trigger brain reinforcement:", err);
    return { error: "Failed to trigger reinforcement" };
  }
}
