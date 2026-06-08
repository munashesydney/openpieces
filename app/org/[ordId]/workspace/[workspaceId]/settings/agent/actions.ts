"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { updateWorkspaceChatLimit } from "@/lib/services/workspace-settings.service";

export type ActionResult = { error: string } | { success: true };

export async function updateAgentSettingsAction(
  workspaceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireWorkspaceOwner(workspaceId);

  const agentName = (formData.get("agentName") as string)?.trim();
  const userNickname = (formData.get("userNickname") as string)?.trim();
  const chatLimitStr = formData.get("chatLimit") as string | null;
  const chatLimit = chatLimitStr ? parseInt(chatLimitStr, 10) : null;

  if (!agentName) {
    return { error: "Agent name is required." };
  }

  if (!userNickname) {
    return { error: "A name for yourself is required." };
  }

  if (chatLimit !== null && (isNaN(chatLimit) || chatLimit < 0)) {
    return { error: "Chat limit must be 0 (unlimited) or at least 1." };
  }

  try {
    await db
      .update(workspaces)
      .set({
        agentName,
        userNickname,
        updatedAt: new Date(),
      })
      .where(
        and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)),
      );

    if (chatLimit !== null) {
      await updateWorkspaceChatLimit(workspaceId, chatLimit);
    }
  } catch (err) {
    console.error("Unexpected error updating agent settings:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/agent`);
  return { success: true };
}
