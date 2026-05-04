import { z } from "zod";

const questionSchema = z.object({
  question: z.string().describe("The question text to display to the user"),
  suggestedAnswers: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Optional selectable answer options, max 3"),
});

const sharedFields = z.object({
  seconds: z
    .number()
    .positive()
    .optional()
    .describe("Number of seconds to sleep"),
  prompt: z.string().optional().describe("Prompt to send to the agent"),
  questions: z
    .array(questionSchema)
    .optional()
    .describe("Array of questions to ask the user"),
  chatId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Chat ID to check progress for, or to continue an existing chat via spawn_agent",
    ),
});

const runtimeNoSpawnInputSchema = sharedFields.extend({
  action: z.enum(["sleep", "ask_question"]).describe("The action to perform"),
});

const runtimeOrchestratorInputSchema = sharedFields.extend({
  action: z
    .enum(["sleep", "spawn_agent", "ask_question", "check_agent_progress"])
    .describe("The action to perform"),
  agentType: z
    .enum(["architecture"])
    .optional()
    .describe(
      "For spawn_agent: must be architecture (you cannot spawn another orchestrator)",
    ),
});

const runtimeEventsInputSchema = sharedFields.extend({
  action: z
    .enum(["sleep", "spawn_agent", "ask_question", "check_agent_progress"])
    .describe("The action to perform"),
  agentType: z
    .enum(["orchestrator"])
    .optional()
    .describe("For spawn_agent: must be orchestrator"),
});

export type SpawnPolicy = {
  canSpawn: boolean;
  allowedTarget: "architecture" | "orchestrator" | null;
};

export function getSpawnPolicy(callerAgentType: string): SpawnPolicy {
  if (callerAgentType === "orchestrator") {
    return { canSpawn: true, allowedTarget: "architecture" };
  }
  if (callerAgentType === "events") {
    return { canSpawn: true, allowedTarget: "orchestrator" };
  }
  return { canSpawn: false, allowedTarget: null };
}

export type RuntimeToolDefinition = {
  name: "runtime";
  description: string;
  inputSchema:
    | typeof runtimeNoSpawnInputSchema
    | typeof runtimeOrchestratorInputSchema
    | typeof runtimeEventsInputSchema;
};

export function createRuntimeToolDefinition(
  callerAgentType: string,
): RuntimeToolDefinition {
  const policy = getSpawnPolicy(callerAgentType);

  if (!policy.canSpawn) {
    return {
      name: "runtime",
      description:
        "Runtime operations for the workspace: sleep, ask questions, and check another agent's progress. Spawning sub-agents is not available from this agent.",
      inputSchema: runtimeNoSpawnInputSchema,
    };
  }

  if (policy.allowedTarget === "architecture") {
    return {
      name: "runtime",
      description:
        "Runtime operations: sleep, spawn the Architecture agent (only), ask questions, and check sub-agent progress.",
      inputSchema: runtimeOrchestratorInputSchema,
    };
  }

  return {
    name: "runtime",
    description:
      "Runtime operations: sleep, spawn the Orchestrator agent (only), ask questions, and check agent progress.",
    inputSchema: runtimeEventsInputSchema,
  };
}

export type RuntimeToolInput =
  | z.infer<typeof runtimeNoSpawnInputSchema>
  | z.infer<typeof runtimeOrchestratorInputSchema>
  | z.infer<typeof runtimeEventsInputSchema>;
