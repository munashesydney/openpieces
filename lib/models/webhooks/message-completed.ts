import { z } from "zod";

export const messageCompletedPayloadSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  toolCalls: z.array(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageCompletedPayload = z.infer<
  typeof messageCompletedPayloadSchema
>;
