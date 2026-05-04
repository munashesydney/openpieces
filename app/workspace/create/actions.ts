"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/services/auth.service";
import { createWorkspace } from "@/lib/services/workspace.service";
import { db } from "@/lib/db";
import { workspaceSettings } from "@/lib/db/schema";

export type ActionResult =
  | { error: string }
  | { success: true; workspaceId: string };

export async function createWorkspaceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const timezone = (formData.get("timezone") as string)?.trim() || "UTC";
  const agentName = (formData.get("agentName") as string)?.trim();
  const userNickname = (formData.get("userNickname") as string)?.trim();

  if (!name) {
    return { error: "Workspace name is required." };
  }

  if (name.length < 1 || name.length > 100) {
    return { error: "Workspace name must be between 1 and 100 characters." };
  }

  try {
    const workspace = await createWorkspace({
      name,
      description,
      userId: user.id,
      agentName,
      userNickname,
    });

    // Create workspace settings with timezone
    await db.insert(workspaceSettings).values({
      workspaceId: workspace.id,
      timezone,
    });

    revalidatePath("/");
    redirect(`/workspace/${workspace.id}/personal`);
  } catch (err) {
    const err_ = err as { digest?: string };
    if (err_?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Unexpected error creating workspace:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
