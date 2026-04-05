import { z } from "zod";

export const runtimeToolDefinition = {
  name: "runtime",
  description: "Runtime operations for the workspace: sleep, spawn sub-agents, and check their progress.",
  inputSchema: z.object({
    action: z
      .enum(["sleep", "spawn_agent", "check_agent_progress"])
      .describe("The action to perform"),
    // sleep
    seconds: z
      .number()
      .positive()
      .optional()
      .describe("Number of seconds to sleep"),
    // spawn_agent
    agentType: z
      .enum(["architecture", "orchestrator"])
      .optional()
      .describe("Type of agent to spawn"),
    prompt: z.string().optional().describe("Prompt to send to the agent"),
    // check_agent_progress
    chatId: z
      .string()
      .uuid()
      .optional()
      .describe("Chat ID to check progress for"),
  }),
};

export type RuntimeToolInput = z.infer<typeof runtimeToolDefinition.inputSchema>;
