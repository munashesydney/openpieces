"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { resetWorkspaceChatLimit } from "@/lib/services/workspace-settings.service";

export async function resetChatLimitAction(workspaceId: string) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  await resetWorkspaceChatLimit(workspaceId);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}`);
}
