import { z } from "zod";

export const chatCreatedPayloadSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
});

export type ChatCreatedPayload = z.infer<typeof chatCreatedPayloadSchema>;
