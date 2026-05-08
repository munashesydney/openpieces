import { z } from "zod";

const taskTypeEnum = z.enum(["one-time", "recurring"]);
const taskStatusEnum = z.enum(["active", "paused", "completed"]);
const intervalTypeEnum = z.enum([
  "minutes",
  "hours",
  "daily",
  "weekly",
  "monthly",
]);

export const taskToolDefinition = {
  name: "manage_tasks",
  description:
    "Manage tasks in the workspace. Use to list tasks, get one by id, list by workflow, create, update, or delete a task. Tasks can be one-time (with specific date/time) or recurring (with customizable schedules like every N minutes, daily at time, weekly on specific day, monthly on date).",
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
      .describe(
        "Workflow ID. Optional for list (filter by workflow). Required in createDetails.",
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
        title: z.string().describe("Title of the task"),
        description: z.string().optional().describe("Description of the task"),
        type: taskTypeEnum.describe("Task type: one-time or recurring"),
        workflowId: z.string().describe("Workflow ID. Required for all tasks."),
        status: taskStatusEnum
          .optional()
          .describe(
            "Status: active, paused, or completed. Defaults to active.",
          ),
        // One-time scheduling
        scheduledAt: z
          .string()
          .optional()
          .describe(
            "ISO datetime for one-time tasks (e.g. '2024-12-25T14:30:00Z')",
          ),
        // Recurring scheduling
        intervalType: intervalTypeEnum
          .optional()
          .describe("Interval type: minutes, hours, daily, weekly, monthly"),
        intervalValue: z
          .number()
          .optional()
          .describe(
            "N in 'every N intervalType' (e.g., 2 for 'every 2 hours'). Required for minutes/hours.",
          ),
        dayOfWeek: z
          .number()
          .min(0)
          .max(6)
          .optional()
          .describe(
            "Day of week (0=Sunday, 1=Monday, etc.). Required for weekly.",
          ),
        dayOfMonth: z
          .number()
          .min(1)
          .max(31)
          .optional()
          .describe("Day of month (1-31). Required for monthly."),
        timeOfDay: z
          .string()
          .optional()
          .describe(
            "Time of day in HH:MM format (e.g., '14:30'). Required for daily/weekly/monthly.",
          ),
        timeWindowStart: z
          .string()
          .optional()
          .describe(
            "Start of time window in HH:MM format (e.g. '09:00'). Only applies to minutes/hours intervals. Restricts recurrence to within this window.",
          ),
        timeWindowEnd: z
          .string()
          .optional()
          .describe(
            "End of time window in HH:MM format (e.g. '17:00'). Only applies to minutes/hours intervals. Restricts recurrence to within this window.",
          ),
        timezone: z
          .string()
          .optional()
          .describe(
            "Timezone (e.g., 'UTC', 'America/New_York'). Defaults to UTC.",
          ),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        type: taskTypeEnum
          .optional()
          .describe("New type: one-time or recurring"),
        status: taskStatusEnum
          .optional()
          .describe("New status: active, paused, or completed"),
        workflowId: z.string().optional().describe("New workflow ID"),
        // One-time scheduling
        scheduledAt: z
          .string()
          .optional()
          .describe("ISO datetime for one-time tasks"),
        // Recurring scheduling
        intervalType: intervalTypeEnum.optional().describe("New interval type"),
        intervalValue: z.number().optional().describe("New interval value"),
        dayOfWeek: z
          .number()
          .min(0)
          .max(6)
          .optional()
          .describe("New day of week"),
        dayOfMonth: z
          .number()
          .min(1)
          .max(31)
          .optional()
          .describe("New day of month"),
        timeOfDay: z.string().optional().describe("New time of day"),
        timeWindowStart: z
          .string()
          .optional()
          .describe("New time window start in HH:MM format"),
        timeWindowEnd: z
          .string()
          .optional()
          .describe("New time window end in HH:MM format"),
        timezone: z.string().optional().describe("New timezone"),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
  }),
};

export type TaskToolInput = z.infer<typeof taskToolDefinition.inputSchema>;
