import { z } from "zod";

export const sessionsToolDefinition = {
  name: "manage_opencode_sessions",
  description:
    "Manage OpenCode coding sessions in the workspace. Use to list sessions, get session details, or create a new session (requires a service with directory). Sessions are tied to services; each session uses the service's directory for code operations. Use manage_opencode_messages to send messages to a session.",
  inputSchema: z.object({
    action: z
      .enum(["list", "get", "create"])
      .describe("The action to perform"),
    sessionId: z
      .string()
      .optional()
      .describe("Session ID. Required for get action."),
    serviceId: z
      .string()
      .optional()
      .describe("Service ID. Required for create action, optional for list action to filter sessions by service."),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for list action"),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Number of items per page for list action"),
  }),
};

export type SessionsToolInput = z.infer<typeof sessionsToolDefinition.inputSchema>;
