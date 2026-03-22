"use server";

import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getActivityLogsByType, getActivityLogById } from "@/lib/services/activity.service";
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
