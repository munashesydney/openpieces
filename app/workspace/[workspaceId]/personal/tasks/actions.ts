"use server";

import { revalidatePath } from "next/cache";
import { createTask, updateTask, deleteTask } from "../../../../../lib/services/task.service";
import { requireUser } from "../../../../../lib/services/auth.service";
import { ValidationError } from "../../../../../lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createTaskAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) ?? "";
  const workflowIdStr = formData.get("workflowId") as string | null;
  const workflowId = workflowIdStr || null;
  const type = formData.get("type") as "one-time" | "recurring";
  const frequency = formData.get("frequency") as string | null;

  try {
    await createTask({
      workspaceId,
      workflowId,
      title,
      description,
      type,
      status: "active",
      frequency: type === "recurring" ? (frequency ?? null) : null,
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error creating task:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
  return { success: true };
}

export async function pauseTaskAction(workspaceId: string, taskId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");
  await updateTask(taskId, workspaceId, { status: "paused" });
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}

export async function resumeTaskAction(workspaceId: string, taskId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");
  await updateTask(taskId, workspaceId, { status: "active" });
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}

export async function completeTaskAction(workspaceId: string, taskId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");
  await updateTask(taskId, workspaceId, { status: "completed" });
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}

export async function deleteTaskAction(workspaceId: string, taskId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");
  await deleteTask(taskId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}
