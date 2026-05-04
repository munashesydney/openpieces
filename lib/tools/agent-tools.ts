import { z } from "zod";

// ──────────────────────────────────────────
//  Agent types
// ──────────────────────────────────────────

export const AGENT_TYPES = [
  "orchestrator",
  "architecture",
  "events",
  "brain",
  "qa",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

// ──────────────────────────────────────────
//  Tool policy
// ──────────────────────────────────────────

/**
 * Central policy: which tools (and which actions within each tool)
 * each agent type is permitted to use.
 *
 * - `"all"`           → all actions of that tool are available
 * - `string[]`        → only those specific actions are allowed
 * - **omitted**       → the tool is not provided to this agent at all
 *
 * Adding a new tool? It defaults to "not provided to anyone" until
 * you explicitly add it here – safer than the opposite.
 */
export const AGENT_TOOL_POLICY: Record<
  AgentType,
  Record<string, "all" | readonly string[]>
> = {
  // ── Orchestrator: full access to everything ──────────────────
  orchestrator: {
    manage_workflows: "all",
    manage_services: "all",
    manage_tasks: "all",
    manage_opencode_sessions: "all",
    manage_opencode_messages: "all",
    manage_secrets: "all",
    manage_service_endpoints: "all",
    call_endpoint: "all",
    manage_workflow_action_links: "all",
    manage_brain: "all",
    runtime: "all",
    web_search: "all",
  },

  // ── Architecture: read / get / list only (no creates, updates, deletes) ──
  architecture: {
    manage_workflows: ["list", "get"],
    manage_services: ["list", "get", "get_logs"],
    manage_tasks: ["list", "get"],
    manage_opencode_sessions: ["list", "get"],
    manage_opencode_messages: ["list"],
    manage_secrets: ["list", "get"],
    manage_service_endpoints: ["list", "get"],
    manage_workflow_action_links: ["list_linked"],
    manage_brain: ["list", "search", "get"],
    // runtime's own definition strips spawn_agent for non-spawner agent types
    runtime: "all",
    web_search: "all",
  },

  // ── Brain: all brain actions + read-only on everything else ──
  brain: {
    manage_brain: "all",
    manage_workflows: ["list", "get"],
    manage_services: ["list", "get", "get_logs"],
    manage_tasks: ["list", "get"],
    manage_opencode_sessions: ["list", "get"],
    manage_opencode_messages: ["list"],
    manage_secrets: ["list", "get"],
    manage_service_endpoints: ["list", "get"],
    manage_workflow_action_links: ["list_linked"],
    runtime: "all",
    web_search: "all",
  },

  // ── QA: all session + message tools, plus read-only on everything else ──
  qa: {
    manage_opencode_sessions: "all",
    manage_opencode_messages: "all",
    manage_services: ["list", "get", "get_logs"],
    manage_workflows: ["list", "get"],
    manage_tasks: ["list", "get"],
    manage_secrets: ["list", "get"],
    manage_service_endpoints: ["list", "get"],
    manage_workflow_action_links: ["list_linked"],
    manage_brain: ["list", "search", "get"],
    runtime: "all",
    web_search: "all",
  },

  // ── Events: read-only + call_endpoint (spawns orchestrator for writes) ──
  events: {
    call_endpoint: "all",
    manage_workflows: ["list", "get"],
    manage_services: ["list", "get", "get_logs"],
    manage_tasks: ["list", "get"],
    manage_opencode_sessions: ["list", "get"],
    manage_opencode_messages: ["list"],
    manage_secrets: ["list", "get"],
    manage_service_endpoints: ["list", "get"],
    manage_workflow_action_links: ["list_linked"],
    manage_brain: ["list", "search", "get"],
    // runtime's own definition permits spawn_agent → orchestrator for "events"
    runtime: "all",
    web_search: "all",
  },
};

// ──────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────

/**
 * Returns the allowed list for a given agent + tool pair.
 * Returns `"all"`, a string array, or `undefined` if the tool is forbidden.
 */
export function getAllowedActions(
  agentType: string,
  toolName: string,
): "all" | readonly string[] | undefined {
  const policy = AGENT_TOOL_POLICY[agentType as AgentType];
  if (!policy) return undefined;
  return policy[toolName];
}

/**
 * Given a tool definition whose input schema has an `action` ZodEnum,
 * returns a copy of the definition with the action enum restricted to
 * `allowedActions`. If `allowedActions === "all"` or the schema has no
 * `action` field, returns the definition unchanged.
 */
export function restrictToolActions<T extends z.ZodRawShape>(
  definition: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<T>;
  },
  allowedActions: "all" | readonly string[],
): { name: string; description: string; inputSchema: z.ZodObject<T> } {
  if (allowedActions === "all") return definition;

  const shape = definition.inputSchema.shape;
  if (!("action" in shape)) return definition;

  const actionField = shape.action;
  if (!(actionField instanceof z.ZodEnum)) return definition;

  // ZodEnum exposes its values via the `.enum` getter (a Record<value, value>)
  const allEnumValues = Object.keys(actionField.enum) as [string, ...string[]];
  const filtered = allEnumValues.filter((v) => allowedActions.includes(v));
  if (filtered.length === allEnumValues.length) return definition; // no change

  return {
    ...definition,
    inputSchema: z.object({
      ...shape,
      action: z.enum(filtered as [string, ...string[]]),
    }) as z.ZodObject<T>,
  };
}
