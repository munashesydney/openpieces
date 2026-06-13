import { z } from "zod";

export const chatDeletedPayloadSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export type ChatDeletedPayload = z.infer<typeof chatDeletedPayloadSchema>;
