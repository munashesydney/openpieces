import { createWorkflowTool } from "@/lib/tools/workflows";
import { createServiceTool } from "@/lib/tools/services";
import { createTaskTool } from "@/lib/tools/tasks";
import { createSessionsTool } from "@/lib/tools/sessions";
import { createMessagesTool } from "@/lib/tools/messages";
import { createSecretsTool } from "@/lib/tools/secrets";
import { createEndpointsTool } from "@/lib/tools/service-endpoints";
import { createCallEndpointTool } from "@/lib/tools/call-endpoint";

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
  };
}
