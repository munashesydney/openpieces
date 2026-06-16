"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import {
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
  getWorkflowById,
} from "@/lib/services/workflow.service";
import {
  linkActionServiceToWorkflow,
  unlinkActionServiceFromWorkflow,
} from "@/lib/services/workflow-action.service";
import { getWorkflowExecutions } from "@/lib/services/workflow-execution.service";
import { ValidationError } from "@/lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createWorkflowAction(
  workspaceId: string,
  formData: FormData,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as "active" | "archived") ?? "active";

  await createWorkflow({ workspaceId, title, description, status });
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/workflows`);
}

export async function updateWorkflowAction(
  workspaceId: string,
  workflowId: string,
  formData: FormData,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) ?? "";
  const status = (formData.get("status") as "active" | "archived") ?? "active";

  await updateWorkflow(workflowId, workspaceId, { title, description, status });
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/workflows`);
  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
}

export async function deleteWorkflowAction(
  workspaceId: string,
  workflowId: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  await deleteWorkflow(workflowId, workspaceId);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/workflows`);
}

export async function linkActionServiceToWorkflowAction(
  workspaceId: string,
  workflowId: string,
  actionServiceId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    await linkActionServiceToWorkflow(workflowId, actionServiceId, workspaceId);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error linking action service:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}

export async function getWorkflowExecutionsAction(
  workspaceId: string,
  workflowId: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  return getWorkflowExecutions(workflowId, workspaceId);
}

export async function unlinkActionServiceFromWorkflowAction(
  workspaceId: string,
  workflowId: string,
  actionServiceId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    await unlinkActionServiceFromWorkflow(workflowId, actionServiceId);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error unlinking action service:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}

export async function addDetailedStepAction(
  workspaceId: string,
  workflowId: string,
  stepContent: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  if (!stepContent?.trim()) {
    return { error: "Step content cannot be empty." };
  }

  try {
    const { getWorkflowById } = await import("@/lib/services/workflow.service");
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

  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}

export async function updateDetailedStepAction(
  workspaceId: string,
  workflowId: string,
  stepIndex: number,
  stepContent: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  if (!stepContent?.trim()) {
    return { error: "Step content cannot be empty." };
  }

  try {
    const { getWorkflowById } = await import("@/lib/services/workflow.service");
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

  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}

// ── Hub Push / Pull ──────────────────────────────

import { getStoredToken, getAuthorizeUrl } from "@/lib/services/hub.service";
import {
  pushWorkflow,
  pullWorkflow,
} from "@/lib/services/hub-workflow.service";
import { getServicesByWorkflowId } from "@/lib/services/service.service";
import { getTasksByWorkflowId } from "@/lib/services/task.service";
import { getActionServicesForWorkflow } from "@/lib/services/workflow-action.service";
import { requireUser } from "@/lib/services/auth.service";

export type HubWorkflowActionResult =
  | { error: string }
  | { redirectUrl: string }
  | { success: true; hubWorkflowId?: string }
  | { notOwner: true };

export async function pushWorkflowToHubAction(
  workspaceId: string,
  workflowId: string,
): Promise<HubWorkflowActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const workflow = await getWorkflowById(workflowId, workspaceId);
  if (!workflow) return { error: "Workflow not found" };

  const token = await getStoredToken();
  if (!token) {
    const currentUrl = `/workspace/${workspaceId}/personal/workflows/${workflowId}`;
    const authUrl = getAuthorizeUrl();
    const redirectUrl = `${authUrl}&state=${encodeURIComponent(currentUrl)}`;
    return { redirectUrl };
  }

  // Gather all linked services (trigger + action) and tasks
  const [triggerServices, linkedActionServices, tasks] = await Promise.all([
    getServicesByWorkflowId(workflowId, workspaceId),
    getActionServicesForWorkflow(workflowId, workspaceId),
    getTasksByWorkflowId(workflowId, workspaceId),
  ]);

  const allServices = [...triggerServices, ...linkedActionServices];

  const result = await pushWorkflow(token, {
    workspaceId,
    workflow: {
      id: workflow.id,
      title: workflow.title,
      description: workflow.description,
      status: workflow.status,
      detailedSteps: workflow.detailedSteps ?? [],
    },
    services: allServices.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      type: s.type,
      hubPieceId: s.hubPieceId,
    })),
    tasks: tasks.map((t) => ({
      title: t.title,
      description: t.description,
      type: t.type,
      scheduledAt: t.scheduledAt ? t.scheduledAt.toISOString() : null,
      intervalType: t.intervalType,
      intervalValue: t.intervalValue,
      dayOfWeek: t.dayOfWeek,
      dayOfMonth: t.dayOfMonth,
      timeOfDay: t.timeOfDay,
      timezone: t.timezone,
      timeWindowStart: t.timeWindowStart,
      timeWindowEnd: t.timeWindowEnd,
      runOnDays: t.runOnDays ?? [],
    })),
  });

  if ("redirectUrl" in result) {
    return { redirectUrl: result.redirectUrl };
  }

  if ("notOwner" in result && result.notOwner) {
    return { notOwner: true };
  }

  if (!result.ok) {
    return { error: result.error ?? "Failed to push workflow" };
  }

  // Store hub workflow id on the local workflow
  await updateWorkflow(workflowId, workspaceId, {
    hubWorkflowId: result.hubWorkflowId,
    hubUpdatedAt: new Date(),
  });

  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true, hubWorkflowId: result.hubWorkflowId };
}

export type PullWorkflowResult =
  | { error: string }
  | { redirectUrl: string }
  | { success: true };

export async function pullWorkflowFromHubAction(
  workspaceId: string,
  existingWorkflowId: string | null,
  hubWorkflowId: string,
): Promise<PullWorkflowResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const token = await getStoredToken();
  if (!token) {
    const currentUrl = existingWorkflowId
      ? `/workspace/${workspaceId}/personal/workflows/${existingWorkflowId}`
      : `/workspace/${workspaceId}/personal/workflows`;
    const authUrl = getAuthorizeUrl();
    const redirectUrl = `${authUrl}&state=${encodeURIComponent(currentUrl)}`;
    return { redirectUrl };
  }

  const user = await requireUser();

  const result = await pullWorkflow(token, {
    workspaceId,
    userId: user.id,
    hubWorkflowId,
    existingWorkflowId: existingWorkflowId ?? undefined,
  });

  if ("redirectUrl" in result) {
    return { redirectUrl: result.redirectUrl };
  }

  if (!result.ok) {
    return { error: result.error ?? "Failed to pull workflow" };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/workflows`);
  if (existingWorkflowId) {
    revalidatePath(
      `/workspace/${workspaceId}/personal/workflows/${existingWorkflowId}`,
    );
  }

  return { success: true };
}

export async function deleteDetailedStepAction(
  workspaceId: string,
  workflowId: string,
  stepIndex: number,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    const { getWorkflowById } = await import("@/lib/services/workflow.service");
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

  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}
