"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

export type ActionResult = { error: string } | { success: true };

export async function updateAgentSettingsAction(
  workspaceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireWorkspaceOwner(workspaceId);

  const agentName = (formData.get("agentName") as string)?.trim();
  const userNickname = (formData.get("userNickname") as string)?.trim();

  if (!agentName) {
    return { error: "Agent name is required." };
  }

  if (!userNickname) {
    return { error: "A name for yourself is required." };
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
  } catch (err) {
    console.error("Unexpected error updating agent settings:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/agent`);
  return { success: true };
}
