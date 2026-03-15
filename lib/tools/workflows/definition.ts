import { z } from "zod";

const workflowStatusEnum = z.enum(["active", "draft", "archived"]);

export const workflowToolDefinition = {
  name: "manage_workflows",
  description:
    "Manage workflows in the workspace. Use to list workflows, get one by id, create, update, or delete a workflow.",
  inputSchema: z.object({
    action: z
      .enum(["list", "get", "create", "update", "delete"])
      .describe("The action to perform"),
    workflowId: z
      .string()
      .optional()
      .describe("Workflow ID. Required for get, update, and delete actions."),
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
        title: z.string().describe("Title of the workflow"),
        description: z.string().optional().describe("Description of the workflow"),
        status: workflowStatusEnum
          .optional()
          .describe("Status: active, draft, or archived. Defaults to draft."),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        status: workflowStatusEnum.optional().describe("New status: active, draft, or archived"),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
  }),
};

export type WorkflowToolInput = z.infer<typeof workflowToolDefinition.inputSchema>;
