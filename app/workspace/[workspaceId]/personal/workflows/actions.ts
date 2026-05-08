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

export async function addDetailedStepAction(
  workspaceId: string,
  workflowId: string,
  stepContent: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  if (!stepContent?.trim()) {
    return { error: "Step content cannot be empty." };
  }

  try {
    const { getWorkflowById } =
      await import("../../../../../lib/services/workflow.service");
    const existing = await getWorkflowById(workflowId, workspaceId);
    if (!existing) {
      return { error: "Workflow not found." };
    }

    const currentSteps = Array.isArray(existing.detailedSteps)
      ? existing.detailedSteps
      : [];

    await updateWorkflow(workflowId, workspaceId, {
      detailedSteps: [...currentSteps, stepContent.trim()],
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error adding step:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
  return { success: true };
}

export async function updateDetailedStepAction(
  workspaceId: string,
  workflowId: string,
  stepIndex: number,
  stepContent: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  if (!stepContent?.trim()) {
    return { error: "Step content cannot be empty." };
  }

  try {
    const { getWorkflowById } =
      await import("../../../../../lib/services/workflow.service");
    const existing = await getWorkflowById(workflowId, workspaceId);
    if (!existing) {
      return { error: "Workflow not found." };
    }

    const currentSteps = Array.isArray(existing.detailedSteps)
      ? [...existing.detailedSteps]
      : [];

    if (stepIndex < 0 || stepIndex >= currentSteps.length) {
      return { error: "Invalid step index." };
    }

    currentSteps[stepIndex] = stepContent.trim();

    await updateWorkflow(workflowId, workspaceId, {
      detailedSteps: currentSteps,
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error updating step:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
  return { success: true };
}

export async function deleteDetailedStepAction(
  workspaceId: string,
  workflowId: string,
  stepIndex: number,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  try {
    const { getWorkflowById } =
      await import("../../../../../lib/services/workflow.service");
    const existing = await getWorkflowById(workflowId, workspaceId);
    if (!existing) {
      return { error: "Workflow not found." };
    }

    const currentSteps = Array.isArray(existing.detailedSteps)
      ? [...existing.detailedSteps]
      : [];

    if (stepIndex < 0 || stepIndex >= currentSteps.length) {
      return { error: "Invalid step index." };
    }

    currentSteps.splice(stepIndex, 1);

    await updateWorkflow(workflowId, workspaceId, {
      detailedSteps: currentSteps,
    });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error deleting step:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/workflows/${workflowId}`);
  return { success: true };
}
