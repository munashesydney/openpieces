import { createWorkflowTool } from "@/lib/tools/workflows";
import { createServiceTool } from "@/lib/tools/services";
import { createTaskTool } from "@/lib/tools/tasks";
import { createSessionsTool } from "@/lib/tools/sessions";
import { createMessagesTool } from "@/lib/tools/messages";
import { createSecretsTool } from "@/lib/tools/secrets";
import { createEndpointsTool } from "@/lib/tools/service-endpoints";
import { createCallEndpointTool } from "@/lib/tools/call-endpoint";
import { createWorkflowActionLinksTool } from "@/lib/tools/workflow-action-links";
import { createBrainTool } from "@/lib/tools/brain";

export type ToolContext = {
  workspaceId: string;
  userId: string;
  chatId: string;
};

export function createTools(context: ToolContext) {
  return {
    manage_workflows: createWorkflowTool(context),
    manage_services: createServiceTool(context),
    manage_tasks: createTaskTool(context),
    manage_opencode_sessions: createSessionsTool(context),
    manage_opencode_messages: createMessagesTool(context),
    manage_secrets: createSecretsTool(context),
    manage_service_endpoints: createEndpointsTool(context),
    call_endpoint: createCallEndpointTool(context),
    manage_workflow_action_links: createWorkflowActionLinksTool(context),
    manage_brain: createBrainTool(context),
  };
}
