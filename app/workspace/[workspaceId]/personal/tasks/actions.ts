"use server";

import { revalidatePath } from "next/cache";
import { createTask, updateTask, deleteTask } from "../../../../../lib/services/task.service";
import { requireUser } from "../../../../../lib/services/auth.service";

export async function createTaskAction(workspaceId: string, formData: FormData) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const workflowId = formData.get("workflowId") as string;
  const type = formData.get("type") as "one-time" | "recurring";
  const frequency = formData.get("frequency") as string;

  await createTask({
    workspaceId,
    workflowId,
    title,
    description,
    type,
    // Note: status is strictly matching schema default 'active'
    status: "active",
    frequency: type === "recurring" ? frequency : null,
  });

  revalidatePath(`/workspace/${workspaceId}/personal/tasks`);
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
