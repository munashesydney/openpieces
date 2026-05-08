import { z } from "zod";

const workflowStatusEnum = z.enum(["active", "archived"]);

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
        description: z
          .string()
          .optional()
          .describe("Description of the workflow"),
        detailedSteps: z
          .array(z.string())
          .optional()
          .describe(
            "Initial list of steps the Events AI should follow when executing this workflow. Each element is one discrete instruction.",
          ),
        status: workflowStatusEnum
          .optional()
          .describe("Status: active or archived. Defaults to active."),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        status: workflowStatusEnum
          .optional()
          .describe("New status: active or archived"),
        detailedSteps: z
          .array(z.string())
          .optional()
          .describe(
            "Bulk replace all steps. Provide the complete new list of instructions.",
          ),
        updateStep: z
          .object({
            index: z
              .number()
              .int()
              .min(0)
              .describe("Zero-based index of the step to update"),
            content: z.string().describe("New content for that step"),
          })
          .optional()
          .describe(
            "Edit a single step at a specific index. Leave other steps unchanged.",
          ),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
  }),
};

export type WorkflowToolInput = z.infer<
  typeof workflowToolDefinition.inputSchema
>;
