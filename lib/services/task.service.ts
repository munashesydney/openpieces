import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import { tasks, workflows, type NewTask, type Task } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { ValidationError } from "../errors/validation-error";
import { calculateNextRunTime } from "./task-execution.service";
import { getWorkspaceSettings } from "./workspace-settings.service";

const VALID_TASK_TYPES = ["one-time", "recurring"] as const;
const VALID_INTERVAL_TYPES = [
  "minutes",
  "hours",
  "daily",
  "weekly",
  "monthly",
] as const;

export async function getTasks(
  workspaceId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ data: Task[]; total: number }> {
  if (!isValidUuid(workspaceId)) return { data: [], total: 0 };

  const offset = (page - 1) * pageSize;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId))
      .limit(pageSize)
      .offset(offset)
      .orderBy(tasks.createdAt),
    db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId)),
  ]);

  return {
    data,
    total: totalResult[0].count,
  };
}

export async function getTasksByWorkflowId(
  workflowId: string,
  workspaceId: string,
): Promise<Task[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];
  return db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.workflowId, workflowId), eq(tasks.workspaceId, workspaceId)),
    );
}

export async function getTaskById(
  taskId: string,
  workspaceId: string,
): Promise<Task | null> {
  if (!isValidUuid(taskId) || !isValidUuid(workspaceId)) return null;
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  return result[0] ?? null;
}

export async function createTask(data: NewTask): Promise<Task> {
  // ── Validate title ────────────────────────────────────────────────────────
  if (!data.title || data.title.trim() === "") {
    throw new ValidationError("Title is required.");
  }

  // ── Validate type ─────────────────────────────────────────────────────────
  if (
    !VALID_TASK_TYPES.includes(data.type as (typeof VALID_TASK_TYPES)[number])
  ) {
    throw new ValidationError(
      `Invalid task type "${data.type}". Must be one of: ${VALID_TASK_TYPES.join(", ")}.`,
    );
  }

  // ── Validate scheduling based on type ─────────────────────────────────────
  if (data.type === "one-time") {
    // One-time tasks should have scheduledAt
    if (!data.scheduledAt) {
      throw new ValidationError("scheduledAt is required for one-time tasks.");
    }
  } else if (data.type === "recurring") {
    // Recurring tasks require intervalType
    if (!data.intervalType) {
      throw new ValidationError(
        "intervalType is required for recurring tasks.",
      );
    }
    if (
      !VALID_INTERVAL_TYPES.includes(
        data.intervalType as (typeof VALID_INTERVAL_TYPES)[number],
      )
    ) {
      throw new ValidationError(
        `Invalid interval type "${data.intervalType}". Must be one of: ${VALID_INTERVAL_TYPES.join(", ")}.`,
      );
    }
    // Validate based on interval type
    if (data.intervalType === "minutes" || data.intervalType === "hours") {
      if (!data.intervalValue || data.intervalValue < 1) {
        throw new ValidationError(
          `intervalValue (minimum 1) is required for ${data.intervalType} tasks.`,
        );
      }
    }
    if (
      data.intervalType === "daily" ||
      data.intervalType === "weekly" ||
      data.intervalType === "monthly"
    ) {
      if (!data.timeOfDay) {
        throw new ValidationError(
          `timeOfDay is required for ${data.intervalType} tasks.`,
        );
      }
    }
    if (data.intervalType === "weekly") {
      if (data.dayOfWeek === null || data.dayOfWeek === undefined) {
        throw new ValidationError("dayOfWeek is required for weekly tasks.");
      }
    }
    if (data.intervalType === "monthly") {
      if (!data.dayOfMonth) {
        throw new ValidationError("dayOfMonth is required for monthly tasks.");
      }
    }
  }

  // ── Validate workflowId — always required for tasks ───────────────────────
  if (!data.workflowId) {
    throw new ValidationError("A workflow is required to create a task.");
  }

  if (!isValidUuid(data.workflowId)) {
    throw new ValidationError(
      `The provided workflow ID "${data.workflowId}" is not a valid ID.`,
    );
  }

  // Verify the workflow exists in this workspace
  const workflow = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(
      and(
        eq(workflows.id, data.workflowId),
        eq(workflows.workspaceId, data.workspaceId),
      ),
    )
    .limit(1);

  if (workflow.length === 0) {
    throw new ValidationError(
      "The selected workflow does not exist in this workspace.",
    );
  }

  const result = await db.insert(tasks).values(data).returning();
  const task = result[0];

  // For recurring tasks, calculate the initial nextRunAt so the poller picks it up
  if (task.type === "recurring" && task.intervalType) {
    // If no explicit timezone was provided, fall back to workspace default
    if (!task.timezone || task.timezone === "UTC") {
      const settings = await getWorkspaceSettings(task.workspaceId);
      if (settings?.timezone && settings.timezone !== "UTC") {
        await db
          .update(tasks)
          .set({ timezone: settings.timezone })
          .where(eq(tasks.id, task.id));
        task.timezone = settings.timezone;
      }
    }
    const nextRunAt = calculateNextRunTime(task);
    await db.update(tasks).set({ nextRunAt }).where(eq(tasks.id, task.id));
    task.nextRunAt = nextRunAt;
  }

  return task;
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  data: Partial<NewTask>,
): Promise<Task> {
  // If intervalType is being updated, validate the scheduling fields
  if (data.intervalType) {
    if (
      !VALID_INTERVAL_TYPES.includes(
        data.intervalType as (typeof VALID_INTERVAL_TYPES)[number],
      )
    ) {
      throw new ValidationError(
        `Invalid interval type "${data.intervalType}". Must be one of: ${VALID_INTERVAL_TYPES.join(", ")}.`,
      );
    }
    if (data.intervalType === "minutes" || data.intervalType === "hours") {
      if (!data.intervalValue || data.intervalValue < 1) {
        throw new ValidationError(
          `intervalValue (minimum 1) is required for ${data.intervalType} tasks.`,
        );
      }
    }
    if (
      data.intervalType === "daily" ||
      data.intervalType === "weekly" ||
      data.intervalType === "monthly"
    ) {
      if (!data.timeOfDay) {
        throw new ValidationError(
          `timeOfDay is required for ${data.intervalType} tasks.`,
        );
      }
    }
    if (data.intervalType === "weekly") {
      if (data.dayOfWeek === null || data.dayOfWeek === undefined) {
        throw new ValidationError("dayOfWeek is required for weekly tasks.");
      }
    }
    if (data.intervalType === "monthly") {
      if (!data.dayOfMonth) {
        throw new ValidationError("dayOfMonth is required for monthly tasks.");
      }
    }
  }

  // If updating scheduling fields on a recurring task, recalculate nextRunAt
  const hasSchedulingChanges =
    data.intervalType !== undefined ||
    data.intervalValue !== undefined ||
    data.dayOfWeek !== undefined ||
    data.dayOfMonth !== undefined ||
    data.timeOfDay !== undefined ||
    data.timezone !== undefined ||
    data.status !== undefined;

  const mergedData = { ...data };

  if (hasSchedulingChanges) {
    // Fetch the current task to merge with updates
    const existing = await getTaskById(taskId, workspaceId);
    if (
      existing &&
      existing.type === "recurring" &&
      (existing.intervalType || mergedData.intervalType)
    ) {
      const mergedTask = { ...existing, ...mergedData };

      // If no explicit timezone in the update, fall back to workspace default
      if (
        data.timezone === undefined &&
        (!mergedTask.timezone || mergedTask.timezone === "UTC")
      ) {
        const settings = await getWorkspaceSettings(workspaceId);
        if (settings?.timezone && settings.timezone !== "UTC") {
          mergedTask.timezone = settings.timezone;
          mergedData.timezone = settings.timezone;
        }
      }

      mergedData.nextRunAt = calculateNextRunTime(mergedTask);
    }
  }

  const result = await db
    .update(tasks)
    .set(mergedData)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();
  return result[0];
}

export async function deleteTask(
  taskId: string,
  workspaceId: string,
): Promise<boolean> {
  const result = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning({ id: tasks.id });
  return result.length > 0;
}
