"use server";

import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getWorkspaceAiUsageMetrics, getWorkspaceAiUsageRecords } from "@/lib/services/ai-usage.service";
import { syncAllWorkspaceOpenCodeUsage } from "@/lib/services/opencode-sync.service";

export async function getUsageDataAction(
  workspaceId: string,
  page: number = 1,
  pageSize: number = 10,
  startDate?: string,
  endDate?: string
) {
  try {
    await requireWorkspaceOwner(workspaceId);
    // Sync open code usage before returning metrics
    await syncAllWorkspaceOpenCodeUsage(workspaceId);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    // Set end date to end of day if provided
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    const metrics = await getWorkspaceAiUsageMetrics(workspaceId, start, end);
    const records = await getWorkspaceAiUsageRecords(workspaceId, page, pageSize, start, end);

    return { metrics, records: records.data, total: records.total };
  } catch (error: any) {
    return { error: error.message };
  }
}
