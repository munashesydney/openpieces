import { z } from "zod";

export const messagesToolDefinition = {
  name: "manage_opencode_messages",
  description:
    "Send a message to an OpenCode session to trigger code generation, or list messages in a formatted conversation style.",
  inputSchema: z.object({
    action: z
      .enum(["send", "list"])
      .describe("The action to perform. Use 'send' to send a message, 'list' to get formatted conversation history."),
    sessionId: z.string().describe("The OpenCode session ID."),
    content: z.string().optional().describe("The message content (required for 'send' action)."),
  }),
};

export type MessagesToolInput = z.infer<typeof messagesToolDefinition.inputSchema>;
