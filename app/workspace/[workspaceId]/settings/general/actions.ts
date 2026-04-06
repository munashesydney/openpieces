"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

export type ActionResult = { error: string } | { success: true };

export async function updateGeneralSettingsAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireWorkspaceOwner(workspaceId);

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!name) {
    return { error: "Workspace name is required." };
  }

  if (name.length < 1 || name.length > 100) {
    return { error: "Workspace name must be between 1 and 100 characters." };
  }

  try {
    await db
      .update(workspaces)
      .set({ name, description, updatedAt: new Date() })
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, user.id)));
  } catch (err) {
    console.error("Unexpected error updating workspace:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/settings/general`);
  return { success: true };
}