import { z } from "zod";

const questionSchema = z.object({
  question: z.string().describe("The question text to display to the user"),
  suggestedAnswers: z.array(z.string()).max(3).optional().describe("Optional selectable answer options, max 3"),
});

export const runtimeToolDefinition = {
  name: "runtime",
  description: "Runtime operations for the workspace: sleep, spawn sub-agents, ask questions, and check their progress.",
  inputSchema: z.object({
    action: z
      .enum(["sleep", "spawn_agent", "ask_question", "check_agent_progress"])
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
    // ask_question
    questions: z.array(questionSchema).optional().describe("Array of questions to ask the user"),
    // check_agent_progress
    chatId: z
      .string()
      .uuid()
      .optional()
      .describe("Chat ID to check progress for"),
  }),
};

export type RuntimeToolInput = z.infer<typeof runtimeToolDefinition.inputSchema>;
