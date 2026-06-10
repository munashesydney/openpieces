"use server";

import { revalidatePath } from "next/cache";
import {
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
} from "@/lib/services/task.service";
import { calculateNextRunTime } from "@/lib/services/task-execution.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { ValidationError } from "@/lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createTaskAction(
  workspaceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

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
  // Time window for minutes/hours intervals
  const timeWindowEnabled = formData.get("timeWindowEnabled") === "true";
  const timeWindowStart = timeWindowEnabled
    ? (formData.get("timeWindowStart") as string)
    : null;
  const timeWindowEnd = timeWindowEnabled
    ? (formData.get("timeWindowEnd") as string)
    : null;
  // Days of week
  const runOnDaysRaw = formData.get("runOnDays") as string | null;
  const runOnDays = runOnDaysRaw ? (JSON.parse(runOnDaysRaw) as number[]) : [];

  try {
    await createTask({
      workspaceId,
      workflowId,
      title,
      description,
      type,
      status: "active",
      scheduledAt,
      intervalType:
        type === "recurring"
          ? (intervalType as
              | "minutes"
              | "hours"
              | "daily"
              | "weekly"
              | "monthly"
              | null)
          : null,
      intervalValue: type === "recurring" ? intervalValue : null,
      dayOfWeek:
        type === "recurring" && intervalType === "weekly" ? dayOfWeek : null,
      dayOfMonth:
        type === "recurring" && intervalType === "monthly" ? dayOfMonth : null,
      timeOfDay: type === "recurring" ? timeOfDay : null,
      timeWindowStart:
        type === "recurring" &&
        (intervalType === "minutes" || intervalType === "hours")
          ? timeWindowStart
          : null,
      timeWindowEnd:
        type === "recurring" &&
        (intervalType === "minutes" || intervalType === "hours")
          ? timeWindowEnd
          : null,
      runOnDays: type === "recurring" ? runOnDays : [],
      timezone: (formData.get("timezone") as string) || "UTC",
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error creating task:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/tasks`);
  return { success: true };
}

export async function pauseTaskAction(workspaceId: string, taskId: string) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  await updateTask(taskId, workspaceId, { status: "paused" });
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/tasks`);
}

export async function resumeTaskAction(workspaceId: string, taskId: string) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  // If resuming a recurring task with no nextRunAt, calculate initial schedule
  const task = await getTaskById(taskId, workspaceId);
  if (
    task &&
    task.type === "recurring" &&
    !task.nextRunAt &&
    task.intervalType
  ) {
    const nextRunAt = calculateNextRunTime(task);
    await updateTask(taskId, workspaceId, { status: "active", nextRunAt });
  } else {
    await updateTask(taskId, workspaceId, { status: "active" });
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/tasks`);
}

export async function completeTaskAction(workspaceId: string, taskId: string) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  await updateTask(taskId, workspaceId, { status: "completed" });
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/tasks`);
}

export async function updateTaskAction(
  workspaceId: string,
  taskId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) ?? "";
  const workflowIdStr = formData.get("workflowId") as string | null;
  const workflowId = workflowIdStr || null;
  const type = formData.get("type") as "one-time" | "recurring" | null;

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
  // Time window for minutes/hours intervals
  const timeWindowEnabled = formData.get("timeWindowEnabled") === "true";
  const timeWindowStart = timeWindowEnabled
    ? (formData.get("timeWindowStart") as string)
    : null;
  const timeWindowEnd = timeWindowEnabled
    ? (formData.get("timeWindowEnd") as string)
    : null;
  // Days of week
  const runOnDaysRaw = formData.get("runOnDays") as string | null;
  const runOnDays = runOnDaysRaw ? (JSON.parse(runOnDaysRaw) as number[]) : [];
  const status = formData.get("status") as string | null;

  try {
    await updateTask(taskId, workspaceId, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== null && { type }),
      ...(workflowId !== undefined && { workflowId }),
      ...(status !== null && {
        status: status as "active" | "paused" | "completed",
      }),
      ...(type === "one-time" ? { scheduledAt } : { scheduledAt: null }),
      ...(type === "recurring"
        ? {
            intervalType:
              (intervalType as
                | "minutes"
                | "hours"
                | "daily"
                | "weekly"
                | "monthly"
                | null) ?? null,
            intervalValue: intervalValue,
            dayOfWeek: intervalType === "weekly" ? dayOfWeek : null,
            dayOfMonth: intervalType === "monthly" ? dayOfMonth : null,
            timeOfDay: timeOfDay ?? null,
            timeWindowStart:
              intervalType === "minutes" || intervalType === "hours"
                ? timeWindowStart
                : null,
            timeWindowEnd:
              intervalType === "minutes" || intervalType === "hours"
                ? timeWindowEnd
                : null,
            runOnDays: runOnDays,
          }
        : {
            intervalType: null,
            intervalValue: null,
            dayOfWeek: null,
            dayOfMonth: null,
            timeOfDay: null,
            timeWindowStart: null,
            timeWindowEnd: null,
            runOnDays: [],
          }),
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error updating task:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/tasks`);
  return { success: true };
}

export async function deleteTaskAction(workspaceId: string, taskId: string) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  await deleteTask(taskId, workspaceId);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/tasks`);
}
