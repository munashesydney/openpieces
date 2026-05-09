"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { resetWorkspaceChatLimit } from "@/lib/services/workspace-settings.service";

export async function resetChatLimitAction(workspaceId: string) {
  await requireWorkspaceOwner(workspaceId);
  await resetWorkspaceChatLimit(workspaceId);
  revalidatePath(`/workspace/${workspaceId}`);
}
