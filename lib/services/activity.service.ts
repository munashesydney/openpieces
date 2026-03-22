import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { activityLog, type ActivityLog } from "../db/schema";
import { isValidUuid } from "../utils/uuid";

export async function getActivityLogs(
  workspaceId: string,
  recordType?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityLog[]> {
  if (!isValidUuid(workspaceId)) return [];

  let query = db
    .select()
    .from(activityLog)
    .where(eq(activityLog.workspaceId, workspaceId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset);

  return query;
}

export async function getActivityLogsByType(
  workspaceId: string,
  recordType: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityLog[]> {
  if (!isValidUuid(workspaceId)) return [];

  return db
    .select()
    .from(activityLog)
    .where(
      and(
        eq(activityLog.workspaceId, workspaceId),
        eq(activityLog.recordType, recordType)
      )
    )
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset);
}
