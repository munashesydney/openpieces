import { z } from "zod";

export const messageErrorPayloadSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageErrorPayload = z.infer<typeof messageErrorPayloadSchema>;
