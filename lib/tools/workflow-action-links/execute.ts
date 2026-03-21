import {
  linkActionServiceToWorkflow,
  unlinkActionServiceFromWorkflow,
  getActionServicesForWorkflow,
} from "@/lib/services/workflow-action.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { WorkflowActionLinksToolInput } from "./definition";

export async function executeWorkflowActionLinks(
  input: WorkflowActionLinksToolInput,
  context: ToolContext
) {
  const { action, workflowId, actionServiceId } = input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  switch (action) {
    case "link": {
      if (!actionServiceId) {
        throw new Error("actionServiceId is required for action 'link'");
      }
      await linkActionServiceToWorkflow(workflowId, actionServiceId, workspaceId);
      return {
        success: true,
        workflowId,
        actionServiceId,
        message: "Action service linked to workflow.",
      };
    }

    case "unlink": {
      if (!actionServiceId) {
        throw new Error("actionServiceId is required for action 'unlink'");
      }
      await unlinkActionServiceFromWorkflow(workflowId, actionServiceId);
      return {
        success: true,
        workflowId,
        actionServiceId,
        message: "Action service unlinked from workflow.",
      };
    }

    case "list_linked": {
      const services = await getActionServicesForWorkflow(workflowId, workspaceId);
      return {
        workflowId,
        linkedActionServices: services,
        total: services.length,
      };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: link, unlink, list_linked.`
      );
    }
  }
}
