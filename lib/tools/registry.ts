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
  /** Tracks tool calls across the current execution attempt to prevent infinite repetition loops. */
  loopState?: {
    callCounts: Map<string, number>;
  };
};

/**
 * Wraps a tool to:
 * 1. Automatically truncate results to prevent blowing up the model context.
 * 2. Track tool calls to prevent infinite repeat loops (exact same name + args).
 */
function withExecutionStrategy<T extends Tool>(toolName: string, t: T, context: ToolContext): T {
  const originalExecute = (t as any).execute;
  if (!originalExecute) return t;

  return {
    ...t,
    execute: async (...args: any[]) => {
      // Prevent exact repeat action loops
      if (context.loopState) {
        const inputStr = JSON.stringify(args[0] || {});
        const callHash = `${toolName}:${inputStr}`;
        const counts = context.loopState.callCounts;
        const timesCalled = counts.get(callHash) || 0;

        counts.set(callHash, timesCalled + 1);

        const isPollingTool = toolName === "runtime" || toolName === "manage_opencode_sessions";
        const warningThreshold = isPollingTool ? 15 : 2;
        const errorThreshold = isPollingTool ? 20 : 3;

        if (timesCalled === warningThreshold) {
          return "System Warning: You are repeating yourself. You have already called this tool with these exact arguments in this turn. Stop repeating this identical call. Assess your progress, formulate a different strategy, suggest alternative tools, or return partial results to the user.";
        }
        if (timesCalled >= errorThreshold) {
          return "System Error: No progress detected. This tool execution has been blocked to prevent an infinite loop. Provide a final text summary immediately and ask the user for instructions on how to proceed.";
        }
      }

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
    manage_workflows: withExecutionStrategy("manage_workflows", createWorkflowTool(context), context),
    manage_services: withExecutionStrategy("manage_services", createServiceTool(context), context),
    manage_tasks: withExecutionStrategy("manage_tasks", createTaskTool(context), context),
    manage_opencode_sessions: withExecutionStrategy("manage_opencode_sessions", createSessionsTool(context), context),
    manage_opencode_messages: withExecutionStrategy("manage_opencode_messages", createMessagesTool(context), context),
    manage_secrets: withExecutionStrategy("manage_secrets", createSecretsTool(context), context),
    manage_service_endpoints: withExecutionStrategy("manage_service_endpoints", createEndpointsTool(context), context),
    call_endpoint: withExecutionStrategy("call_endpoint", createCallEndpointTool(context), context),
    manage_workflow_action_links: withExecutionStrategy("manage_workflow_action_links", createWorkflowActionLinksTool(context), context),
    manage_brain: withExecutionStrategy("manage_brain", createBrainTool(context), context),
    runtime: withExecutionStrategy("runtime", createRuntimeTool(context), context),
    web_search: withExecutionStrategy("web_search", createWebSearchTool(context), context),
  };
}
