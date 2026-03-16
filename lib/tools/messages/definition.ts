import { z } from "zod";

export const messagesToolDefinition = {
  name: "manage_opencode_messages",
  description:
    "Send a message to an OpenCode session to trigger code generation.",
  inputSchema: z.object({
    action: z
      .enum(["send"])
      .describe("The action to perform. Use 'send' to send a message to a session."),
    sessionId: z.string().describe("The OpenCode session ID to send the message to."),
    content: z.string().describe("The message content (e.g. 'Add a login form', 'Fix the bug in utils.ts')."),
  }),
};

export type MessagesToolInput = z.infer<typeof messagesToolDefinition.inputSchema>;
