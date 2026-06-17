import { tool, type Tool } from "ai";
import { createRuntimeTool } from "@/lib/tools/runtime";
import {
  getAllowedActions,
  isDoAction,
  restrictToolActions,
} from "@/lib/tools/agent-tools";
import { truncateToolOutput } from "@/lib/ai-chat/tool-truncation";

// ── Tool definitions ──
import { workflowToolDefinition } from "@/lib/tools/workflows/definition";
import { serviceToolDefinition } from "@/lib/tools/services/definition";
import { taskToolDefinition } from "@/lib/tools/tasks/definition";
import { sessionsToolDefinition } from "@/lib/tools/sessions/definition";
import { messagesToolDefinition } from "@/lib/tools/messages/definition";
import { secretsToolDefinition } from "@/lib/tools/secrets/definition";
import { endpointsToolDefinition } from "@/lib/tools/service-endpoints/definition";
import { callEndpointToolDefinition } from "@/lib/tools/call-endpoint/definition";
import { workflowActionLinksToolDefinition } from "@/lib/tools/workflow-action-links/definition";
import { brainToolDefinition } from "@/lib/tools/brain/definition";
import { eventsToolDefinition } from "@/lib/tools/events/definition";
import { webSearchToolDefinition } from "@/lib/tools/web-search/definition";

// ── Tool execute functions ──
import { executeWorkflow } from "@/lib/tools/workflows/execute";
import { executeService } from "@/lib/tools/services/execute";
import { executeTask } from "@/lib/tools/tasks/execute";
import { executeSessions } from "@/lib/tools/sessions/execute";
import { executeMessages } from "@/lib/tools/messages/execute";
import { executeSecrets } from "@/lib/tools/secrets/execute";
import { executeEndpoints } from "@/lib/tools/service-endpoints/execute";
import { executeCallEndpoint } from "@/lib/tools/call-endpoint/execute";
import { executeWorkflowActionLinks } from "@/lib/tools/workflow-action-links/execute";
import { executeBrainTool } from "@/lib/tools/brain/execute";
import { executeEventsTool } from "@/lib/tools/events/execute";
import { executeWebSearchTool } from "@/lib/tools/web-search/execute";

export type ToolContext = {
  workspaceId: string;
  userId: string;
  chatId: string;
  /** Agent type for the current chat; used to restrict tools. */
  agentType: string;
  /** Chat mode: "agent" (full access) or "chat" (read-only + blocked DO actions). */
  mode?: "agent" | "chat";
  /** Tracks tool calls across the current execution attempt to prevent infinite repetition loops. */
  loopState?: {
    callCounts: Map<string, number>;
  };
};

// ──────────────────────────────────────────
//  Execution strategy wrapper
// ──────────────────────────────────────────

/**
 * Wraps a tool to:
 * 1. Automatically truncate results to prevent blowing up the model context.
 * 2. Track tool calls to prevent infinite repeat loops (exact same name + args).
 */
function withExecutionStrategy<T extends Tool>(
  toolName: string,
  t: T,
  context: ToolContext,
): T {
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

        const isPollingTool =
          toolName === "runtime" || toolName === "manage_opencode_sessions";
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

// ──────────────────────────────────────────
//  Policy-aware tool creation
// ──────────────────────────────────────────

/**
 * When in chat mode, intercepts DO actions and returns a permission error
 * instead of executing them.
 */
function withModeGuard(
  toolName: string,
  executeFn: (input: any) => any,
  context: ToolContext,
): (input: any) => any {
  if (context.mode !== "chat") return executeFn;

  return async (input: any) => {
    const action = input?.action;
    if (isDoAction(toolName, action)) {
      return {
        permissionDenied: true,
        message:
          "Permission denied: this action is not available in chat mode. " +
          "If the user asked you to do this, remind them they are in chat mode " +
          "and ask them to switch to agent mode.",
      };
    }
    return executeFn(input);
  };
}

/**
 * Creates a tool IF the agent is allowed to use it, otherwise returns `null`.
 * When only a subset of actions are allowed, the action ZodEnum is restricted
 * so the model never sees forbidden options.
 *
 * When in chat mode, DO actions are intercepted and return a permission error.
 */
function createToolIfAllowed(
  toolName: string,
  definition: { name: string; description: string; inputSchema: any },
  executeFn: (input: any, context: ToolContext) => any,
  context: ToolContext,
): Tool | null {
  const allowed = getAllowedActions(context.agentType, toolName);
  if (!allowed) return null;

  const restrictedDef = restrictToolActions(definition, allowed);

  // In chat mode, DO actions are soft-blocked with a permission error
  const guardedExecute = withModeGuard(
    toolName,
    (input: any) => executeFn(input, context),
    context,
  );

  return tool({
    ...restrictedDef,
    execute: guardedExecute,
  });
}

/** Shorthand: checks policy, creates (if allowed), wraps with execution strategy. */
function addIfAllowed(
  registry: Record<string, Tool>,
  toolName: string,
  definition: { name: string; description: string; inputSchema: any },
  executeFn: (input: any, context: ToolContext) => any,
  context: ToolContext,
): void {
  const t = createToolIfAllowed(toolName, definition, executeFn, context);
  if (t) {
    registry[toolName] = withExecutionStrategy(toolName, t, context);
  }
}

// ──────────────────────────────────────────
//  Tool factory
// ──────────────────────────────────────────

export function createTools(context: ToolContext) {
  const tools: Record<string, Tool> = {};

  // ── Policy-governed tools (skipped entirely if not in the agent's policy) ──
  addIfAllowed(
    tools,
    "manage_workflows",
    workflowToolDefinition,
    executeWorkflow,
    context,
  );
  addIfAllowed(
    tools,
    "manage_services",
    serviceToolDefinition,
    executeService,
    context,
  );
  addIfAllowed(tools, "manage_tasks", taskToolDefinition, executeTask, context);
  addIfAllowed(
    tools,
    "manage_opencode_sessions",
    sessionsToolDefinition,
    executeSessions,
    context,
  );
  addIfAllowed(
    tools,
    "manage_opencode_messages",
    messagesToolDefinition,
    executeMessages,
    context,
  );
  addIfAllowed(
    tools,
    "manage_secrets",
    secretsToolDefinition,
    executeSecrets,
    context,
  );
  addIfAllowed(
    tools,
    "manage_service_endpoints",
    endpointsToolDefinition,
    executeEndpoints,
    context,
  );
  addIfAllowed(
    tools,
    "call_endpoint",
    callEndpointToolDefinition,
    executeCallEndpoint,
    context,
  );
  addIfAllowed(
    tools,
    "manage_workflow_action_links",
    workflowActionLinksToolDefinition,
    executeWorkflowActionLinks,
    context,
  );
  addIfAllowed(
    tools,
    "manage_brain",
    brainToolDefinition,
    executeBrainTool,
    context,
  );
  addIfAllowed(
    tools,
    "manage_events",
    eventsToolDefinition,
    executeEventsTool,
    context,
  );
  addIfAllowed(
    tools,
    "web_search",
    webSearchToolDefinition,
    executeWebSearchTool,
    context,
  );

  // ── Runtime tool (agent-aware internally + mode-guarded) ──
  // Always created; the runtime tool's own definition handles agent-specific
  // restrictions (e.g. who can spawn_agent, who can spawn whom).
  // The mode guard additionally blocks spawn_agent in chat mode.
  const runtimeTool = createRuntimeTool(context);
  const guardedRuntimeExecute = withModeGuard(
    "runtime",
    (runtimeTool as any).execute,
    context,
  );
  tools.runtime = withExecutionStrategy(
    "runtime",
    {
      ...runtimeTool,
      execute: guardedRuntimeExecute,
    } as Tool,
    context,
  );

  return tools;
}
