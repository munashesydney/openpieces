"use server";

import { revalidatePath } from "next/cache";
import { createTask, updateTask, deleteTask } from "../../../../../lib/services/task.service";
import { requireWorkspaceOwner } from "../../../../../lib/services/auth.service";
import { ValidationError } from "../../../../../lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createTaskAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) ?? "";
  const workflowIdStr = formData.get("workflowId") as string | null;
  const workflowId = workflowIdStr || null;
  const type = formData.get("type") as "one-time" | "recurring";

  // One-time scheduling
  const scheduledAtStr = formData.get("scheduledAt") as string | null;
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;

  // Recurring scheduling
  const intervalType = formData.get("intervalType") as string | null;
  const intervalValueStr = formData.get("intervalValue") as string | null;
  const intervalValue = intervalValueStr ? parseInt(intervalValueStr) : null;
  const dayOfWeekStr = formData.get("dayOfWeek") as string | null;
  const dayOfWeek = dayOfWeekStr ? parseInt(dayOfWeekStr) : null;
  const dayOfMonthStr = formData.get("dayOfMonth") as string | null;
  const dayOfMonth = dayOfMonthStr ? parseInt(dayOfMonthStr) : null;
  const timeOfDay = formData.get("timeOfDay") as string | null;

  try {
    await createTask({
      workspaceId,
      workflowId,
      title,
      description,
      type,
      status: "active",
      scheduledAt,
      intervalType: type === "recurring" ? (intervalType as "minutes" | "hours" | "daily" | "weekly" | "monthly" | null) : null,
      intervalValue: type === "recurring" ? intervalValue : null,
      dayOfWeek: type === "recurring" && intervalType === "weekly" ? dayOfWeek : null,
      dayOfMonth: type === "recurring" && intervalType === "monthly" ? dayOfMonth : null,
      timeOfDay: type === "recurring" ? timeOfDay : null,
      timezone: "UTC",
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
  await requireWorkspaceOwner(workspaceId);
  await updateTask(taskId, workspaceId, { status: "paused" });
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}

export async function resumeTaskAction(workspaceId: string, taskId: string) {
  await requireWorkspaceOwner(workspaceId);
  await updateTask(taskId, workspaceId, { status: "active" });
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}

export async function completeTaskAction(workspaceId: string, taskId: string) {
  await requireWorkspaceOwner(workspaceId);
  await updateTask(taskId, workspaceId, { status: "completed" });
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}

export async function deleteTaskAction(workspaceId: string, taskId: string) {
  await requireWorkspaceOwner(workspaceId);
  await deleteTask(taskId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
}
