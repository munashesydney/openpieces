import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "@/lib/services/workflow.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { WorkflowToolInput } from "./definition";

export async function executeWorkflow(
  input: WorkflowToolInput,
  context: ToolContext,
) {
  const { action, workflowId, page, limit, createDetails, updateDetails } =
    input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  switch (action) {
    case "list": {
      return await getWorkflows(workspaceId, page ?? 1, limit ?? 10);
    }

    case "get": {
      if (!workflowId) {
        throw new Error("workflowId is required for action 'get'");
      }
      const workflow = await getWorkflowById(workflowId, workspaceId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      return workflow;
    }

    case "create": {
      if (!createDetails) {
        throw new Error("createDetails is required for action 'create'");
      }
      if (!createDetails.title?.trim()) {
        throw new Error("createDetails.title is required for action 'create'");
      }
      return await createWorkflow({
        workspaceId,
        title: createDetails.title,
        description: createDetails.description ?? "",
        detailedSteps: createDetails.detailedSteps ?? [],
        status: createDetails.status ?? "active",
      });
    }

    case "update": {
      if (!workflowId) {
        throw new Error("workflowId is required for action 'update'");
      }
      if (!updateDetails || Object.keys(updateDetails).length === 0) {
        throw new Error(
          "updateDetails with at least one field is required for action 'update'",
        );
      }
      // Fetch existing workflow if we need to mutate a single step
      let existingDetailedSteps: string[] | undefined;

      if (
        updateDetails.updateStep !== undefined &&
        updateDetails.detailedSteps === undefined
      ) {
        const existing = await getWorkflowById(workflowId, workspaceId);
        if (!existing) {
          throw new Error(`Workflow not found: ${workflowId}`);
        }
        existingDetailedSteps = Array.isArray(existing.detailedSteps)
          ? [...existing.detailedSteps]
          : [];

        const { index, content } = updateDetails.updateStep;
        if (index < 0 || index >= existingDetailedSteps.length) {
          throw new Error(
            `Invalid step index ${index}. Workflow has ${existingDetailedSteps.length} step(s).`,
          );
        }
        existingDetailedSteps[index] = content;
      }

      const updated = await updateWorkflow(workflowId, workspaceId, {
        ...(updateDetails.title !== undefined && {
          title: updateDetails.title,
        }),
        ...(updateDetails.description !== undefined && {
          description: updateDetails.description,
        }),
        ...(updateDetails.detailedSteps !== undefined && {
          detailedSteps: updateDetails.detailedSteps,
        }),
        ...(existingDetailedSteps !== undefined && {
          detailedSteps: existingDetailedSteps,
        }),
        ...(updateDetails.status !== undefined && {
          status: updateDetails.status,
        }),
      });
      if (!updated) {
        throw new Error(`Workflow not found or update failed: ${workflowId}`);
      }
      return updated;
    }

    case "delete": {
      if (!workflowId) {
        throw new Error("workflowId is required for action 'delete'");
      }
      const deleted = await deleteWorkflow(workflowId, workspaceId);
      if (!deleted) {
        throw new Error(`Workflow not found or delete failed: ${workflowId}`);
      }
      return { success: true, deleted: workflowId };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, get, create, update, delete.`,
      );
    }
  }
}
