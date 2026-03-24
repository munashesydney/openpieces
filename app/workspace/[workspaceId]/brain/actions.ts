"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getActivityLogsByType, getActivityLogById } from "@/lib/services/activity.service";
import {
  getBrainSettings,
  updateBrainSettings,
  getBrainEntries,
  searchBrain,
  getBrainStats,
  getUnprocessedActivityLogs,
  markActivityLogsProcessed,
  createBrainEntry,
  getBrainEntriesForReinforcement,
  reinforceBrainEntry,
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
  formData: FormData
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const ingestionEnabled = formData.get("ingestionEnabled") === "true";
  const ingestionIntervalMinutes = parseInt(formData.get("ingestionIntervalMinutes") as string) || 60;
  const reinforcementEnabled = formData.get("reinforcementEnabled") === "true";
  const reinforcementIntervalHours = parseInt(formData.get("reinforcementIntervalHours") as string) || 24;
  const reinforcementBatchSize = parseInt(formData.get("reinforcementBatchSize") as string) || 10;

  try {
    await updateBrainSettings(workspaceId, {
      ingestionEnabled,
      ingestionIntervalMinutes,
      reinforcementEnabled,
      reinforcementIntervalHours,
      reinforcementBatchSize,
    });
  } catch (err) {
    console.error("Unexpected error updating brain settings:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/brain`);
  return { success: true };
}

export async function getBrainEntriesAction(
  workspaceId: string,
  page: number = 1
) {
  await requireWorkspaceOwner(workspaceId);
  return await getBrainEntries(workspaceId, page, 20);
}

export async function searchBrainAction(
  workspaceId: string,
  query: string
) {
  await requireWorkspaceOwner(workspaceId);
  return await searchBrain(query, workspaceId, 20);
}

export async function getBrainStatsAction(workspaceId: string) {
  await requireWorkspaceOwner(workspaceId);
  return await getBrainStats(workspaceId);
}

export async function triggerBrainIngestionAction(workspaceId: string) {
  await requireWorkspaceOwner(workspaceId);

  const unprocessedLogs = await getUnprocessedActivityLogs(workspaceId, 50);

  if (unprocessedLogs.length === 0) {
    return { processed: 0, message: "No unprocessed activity logs found" };
  }

  const processedIds: string[] = [];

  for (const log of unprocessedLogs) {
    try {
      const summary = `${log.operation} on ${log.recordType}${log.recordId ? ` (ID: ${log.recordId})` : ""}`;

      await createBrainEntry({
        workspaceId: log.workspaceId,
        type: "fact",
        category: "general",
        summary,
        recordType: log.recordType,
        recordId: log.recordId ?? null,
        tags: [log.recordType, log.operation.toLowerCase()],
      });

      processedIds.push(log.id);
    } catch (error) {
      console.error(`[brain] Failed to process activity ${log.id}:`, error);
    }
  }

  if (processedIds.length > 0) {
    await markActivityLogsProcessed(processedIds);
  }

  revalidatePath(`/workspace/${workspaceId}/brain`);
  return {
    processed: processedIds.length,
    message: `Successfully processed ${processedIds.length} activity logs`,
  };
}

export async function triggerBrainReinforcementAction(workspaceId: string) {
  await requireWorkspaceOwner(workspaceId);

  const entries = await getBrainEntriesForReinforcement(workspaceId, 10);

  if (entries.length === 0) {
    return { reinforced: 0, message: "No entries need reinforcement" };
  }

  let reinforced = 0;
  for (const entry of entries) {
    try {
      await reinforceBrainEntry(entry.id, entry.summary);
      reinforced++;
    } catch (error) {
      console.error(`[brain] Failed to reinforce entry ${entry.id}:`, error);
    }
  }

  revalidatePath(`/workspace/${workspaceId}/brain`);
  return {
    reinforced,
    message: `Successfully reinforced ${reinforced} brain entries`,
  };
}
