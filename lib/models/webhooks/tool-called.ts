import { z } from "zod";

export const toolCalledPayloadSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.any(),
  executedAt: z.string(),
});

export type ToolCalledPayload = z.infer<typeof toolCalledPayloadSchema>;
