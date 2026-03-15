import { z } from "zod";

const taskTypeEnum = z.enum(["one-time", "recurring"]);
const taskStatusEnum = z.enum(["active", "paused", "completed"]);

export const taskToolDefinition = {
  name: "manage_tasks",
  description:
    "Manage tasks in the workspace. Use to list tasks, get one by id, list by workflow, create, update, or delete a task. Tasks can be one-time or recurring (recurring requires frequency e.g. daily, weekly).",
  inputSchema: z.object({
    action: z
      .enum(["list", "get", "create", "update", "delete"])
      .describe("The action to perform"),
    taskId: z
      .string()
      .optional()
      .describe("Task ID. Required for get, update, and delete actions."),
    workflowId: z
      .string()
      .optional()
      .describe("Workflow ID. Optional for list (filter by workflow). Required in createDetails."),
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
        title: z.string().describe("Title of the task"),
        description: z.string().optional().describe("Description of the task"),
        type: taskTypeEnum.describe("Task type: one-time or recurring. Recurring requires frequency."),
        workflowId: z.string().describe("Workflow ID. Required for all tasks."),
        status: taskStatusEnum
          .optional()
          .describe("Status: active, paused, or completed. Defaults to active."),
        scheduledFor: z.string().optional().describe("When to run (for one-time tasks)."),
        frequency: z
          .string()
          .optional()
          .describe("Frequency for recurring tasks, e.g. daily, weekly, monthly. Required when type is recurring."),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        type: taskTypeEnum.optional().describe("New type: one-time or recurring"),
        status: taskStatusEnum.optional().describe("New status: active, paused, or completed"),
        scheduledFor: z.string().optional().describe("New scheduled time"),
        frequency: z.string().optional().describe("New frequency for recurring"),
        workflowId: z.string().optional().describe("New workflow ID"),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
  }),
};

export type TaskToolInput = z.infer<typeof taskToolDefinition.inputSchema>;
