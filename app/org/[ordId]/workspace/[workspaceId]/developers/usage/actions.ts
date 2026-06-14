"use server";

import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { getWorkspaceAiUsageMetrics, getWorkspaceAiUsageRecords } from "@/lib/services/ai-usage.service";
import { syncAllWorkspaceOpenCodeUsage } from "@/lib/services/opencode-sync.service";

export async function getUsageDataAction(workspaceId: string) {
  try {
    await requireWorkspaceOwner(workspaceId);
    // Sync open code usage before returning metrics
    await syncAllWorkspaceOpenCodeUsage(workspaceId);

    const metrics = await getWorkspaceAiUsageMetrics(workspaceId);
    const records = await getWorkspaceAiUsageRecords(workspaceId, 100);

    return { metrics, records };
  } catch (error: any) {
    return { error: error.message };
  }
}
