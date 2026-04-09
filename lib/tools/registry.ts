import { tool, type Tool } from "ai";
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
import { createRuntimeTool } from "@/lib/tools/runtime";
import { createWebSearchTool } from "@/lib/tools/web-search";
import { truncateToolOutput } from "@/lib/ai-chat/tool-truncation";

export type ToolContext = {
  workspaceId: string;
  userId: string;
  chatId: string;
  /** Agent type for the current chat; used to restrict tools like runtime spawn_agent. */
  agentType: string;
};

/**
 * Wraps a tool so its execute result is automatically truncated before
 * the AI SDK uses it for internal multi-step context accumulation.
 * Without this, large tool results (e.g. vector store dumps) blow up
 * the model's context window across tool-call steps.
 */
function withTruncatedOutput<T extends Tool>(t: T): T {
  const originalExecute = (t as any).execute;
  if (!originalExecute) return t;

  return {
    ...t,
    execute: async (...args: any[]) => {
      const result = await originalExecute(...args);
      // Stringify, truncate, then return as a string so the SDK
      // stores the truncated version in its internal message chain
      const raw = typeof result === "string" ? result : JSON.stringify(result);
      const { content } = truncateToolOutput(raw);
      return content;
    },
  } as T;
}

export function createTools(context: ToolContext) {
  return {
    manage_workflows: withTruncatedOutput(createWorkflowTool(context)),
    manage_services: withTruncatedOutput(createServiceTool(context)),
    manage_tasks: withTruncatedOutput(createTaskTool(context)),
    manage_opencode_sessions: withTruncatedOutput(createSessionsTool(context)),
    manage_opencode_messages: withTruncatedOutput(createMessagesTool(context)),
    manage_secrets: withTruncatedOutput(createSecretsTool(context)),
    manage_service_endpoints: withTruncatedOutput(createEndpointsTool(context)),
    call_endpoint: withTruncatedOutput(createCallEndpointTool(context)),
    manage_workflow_action_links: withTruncatedOutput(createWorkflowActionLinksTool(context)),
    manage_brain: withTruncatedOutput(createBrainTool(context)),
    runtime: withTruncatedOutput(createRuntimeTool(context)),
    web_search: withTruncatedOutput(createWebSearchTool(context)),
  };
}
