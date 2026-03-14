"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../../../../../lib/services/auth.service";
import {
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
} from "../../../../../lib/services/workflow.service";

export async function createWorkflowAction(workspaceId: string, formData: FormData) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as "active" | "draft" | "archived") ?? "draft";

  await createWorkflow({ workspaceId, title, description, status });
  revalidatePath(`/workspace/${workspaceId}/personal/workflows`);
}

export async function updateWorkflowAction(
  workspaceId: string,
  workflowId: string,
  formData: FormData
) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as "active" | "draft" | "archived") ?? "draft";

  await updateWorkflow(workflowId, workspaceId, { title, description, status });
  revalidatePath(`/workspace/${workspaceId}/personal/workflows`);
  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
}

export async function deleteWorkflowAction(workspaceId: string, workflowId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  await deleteWorkflow(workflowId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/workflows`);
}
