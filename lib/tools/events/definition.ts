import { z } from "zod";

export const eventsToolDefinition = {
  name: "manage_events",
  description:
    "Manage events in the workspace. Use to list events, get one by id or name, create, update, delete an event, or list which workflows are subscribed to which events.",
  inputSchema: z.object({
    action: z
      .enum(["list", "get", "create", "update", "delete", "list_subscriptions"])
      .describe("The action to perform"),
    eventId: z
      .string()
      .optional()
      .describe("Event ID. Required for get, update, delete actions."),
    eventName: z
      .string()
      .optional()
      .describe(
        "Event name (e.g. 'stripe.payment_intent.succeeded'). Used for get action to look up by name.",
      ),
    workflowId: z
      .string()
      .optional()
      .describe(
        "Workflow ID. Used with list_subscriptions to filter by workflow.",
      ),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for list action"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Number of items per page for list action"),
    createDetails: z
      .object({
        eventName: z
          .string()
          .describe(
            "Unique event name, e.g. 'stripe.payment_intent.succeeded'",
          ),
        description: z
          .string()
          .optional()
          .describe("Optional description of what this event represents"),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        eventName: z.string().optional().describe("New event name"),
        description: z.string().optional().describe("New description"),
      })
      .optional()
      .describe(
        "Details for update action. Leave fields you don't want to change out.",
      ),
  }),
};

export type EventsToolInput = z.infer<typeof eventsToolDefinition.inputSchema>;
