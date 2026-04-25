"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "../../../../../lib/services/auth.service";
import {
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
} from "../../../../../lib/services/workflow.service";
import {
  linkActionServiceToWorkflow,
  unlinkActionServiceFromWorkflow,
} from "../../../../../lib/services/workflow-action.service";
import { getWorkflowExecutions } from "../../../../../lib/services/workflow-execution.service";
import { ValidationError } from "../../../../../lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createWorkflowAction(
  workspaceId: string,
  formData: FormData,
) {
  await requireWorkspaceOwner(workspaceId);

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as "active" | "archived") ?? "active";

  await createWorkflow({ workspaceId, title, description, status });
  revalidatePath(`/workspace/${workspaceId}/personal/workflows`);
}

export async function updateWorkflowAction(
  workspaceId: string,
  workflowId: string,
  formData: FormData,
) {
  await requireWorkspaceOwner(workspaceId);

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as "active" | "archived") ?? "active";

  await updateWorkflow(workflowId, workspaceId, { title, description, status });
  revalidatePath(`/workspace/${workspaceId}/personal/workflows`);
  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
}

export async function deleteWorkflowAction(
  workspaceId: string,
  workflowId: string,
) {
  await requireWorkspaceOwner(workspaceId);

  await deleteWorkflow(workflowId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/workflows`);
}

export async function linkActionServiceToWorkflowAction(
  workspaceId: string,
  workflowId: string,
  actionServiceId: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  try {
    await linkActionServiceToWorkflow(workflowId, actionServiceId, workspaceId);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error linking action service:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
  return { success: true };
}

export async function getWorkflowExecutionsAction(
  workspaceId: string,
  workflowId: string,
) {
  await requireWorkspaceOwner(workspaceId);
  return getWorkflowExecutions(workflowId, workspaceId);
}

export async function unlinkActionServiceFromWorkflowAction(
  workspaceId: string,
  workflowId: string,
  actionServiceId: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  try {
    await unlinkActionServiceFromWorkflow(workflowId, actionServiceId);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error unlinking action service:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
  return { success: true };
}
