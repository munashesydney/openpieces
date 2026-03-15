import { z } from "zod";

const serviceTypeEnum = z.enum(["trigger", "action"]);

export const serviceToolDefinition = {
  name: "manage_services",
  description:
    "Manage services in the workspace. Use to list services, get one by id, list by workflow, create, update, or delete a service. Services can be type 'trigger' (requires workflowId) or 'action'.",
  inputSchema: z.object({
    action: z
      .enum(["list", "get", "create", "update", "delete"])
      .describe("The action to perform"),
    serviceId: z
      .string()
      .optional()
      .describe("Service ID. Required for get, update, and delete actions."),
    workflowId: z
      .string()
      .optional()
      .describe("Workflow ID. Optional for list (filter by workflow). Required in createDetails when type is 'trigger'."),
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
        title: z.string().describe("Title of the service"),
        description: z.string().optional().describe("Description of the service"),
        type: serviceTypeEnum.describe("Service type: trigger or action. Trigger requires workflowId."),
        workflowId: z
          .string()
          .optional()
          .describe("Workflow ID. Required when type is 'trigger'."),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        type: serviceTypeEnum.optional().describe("New type: trigger or action"),
        workflowId: z.string().optional().describe("New workflow ID"),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
  }),
};

export type ServiceToolInput = z.infer<typeof serviceToolDefinition.inputSchema>;
