import { z } from "zod";

export const messageCreatedPayloadSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
});

export type MessageCreatedPayload = z.infer<typeof messageCreatedPayloadSchema>;
