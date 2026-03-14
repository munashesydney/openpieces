import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { tasks, workflows, type NewTask, type Task } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { ValidationError } from "../errors/validation-error";

const VALID_TASK_TYPES = ["one-time", "recurring"] as const;

export async function getTasks(workspaceId: string): Promise<Task[]> {
  if (!isValidUuid(workspaceId)) return [];
  return db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId));
}

export async function getTasksByWorkflowId(workflowId: string, workspaceId: string): Promise<Task[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.workflowId, workflowId), eq(tasks.workspaceId, workspaceId)));
}

export async function getTaskById(taskId: string, workspaceId: string): Promise<Task | null> {
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
  if (!VALID_TASK_TYPES.includes(data.type as typeof VALID_TASK_TYPES[number])) {
    throw new ValidationError(
      `Invalid task type "${data.type}". Must be one of: ${VALID_TASK_TYPES.join(", ")}.`
    );
  }

  // ── Validate frequency for recurring tasks ────────────────────────────────
  if (data.type === "recurring" && (!data.frequency || data.frequency.trim() === "")) {
    throw new ValidationError("Frequency is required for recurring tasks.");
  }

  // ── Validate workflowId — always required for tasks ───────────────────────
  if (!data.workflowId) {
    throw new ValidationError("A workflow is required to create a task.");
  }

  if (!isValidUuid(data.workflowId)) {
    throw new ValidationError(
      `The provided workflow ID "${data.workflowId}" is not a valid ID.`
    );
  }

  // Verify the workflow exists in this workspace
  const workflow = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(
      and(
        eq(workflows.id, data.workflowId),
        eq(workflows.workspaceId, data.workspaceId)
      )
    )
    .limit(1);

  if (workflow.length === 0) {
    throw new ValidationError(
      "The selected workflow does not exist in this workspace."
    );
  }

  const result = await db.insert(tasks).values(data).returning();
  return result[0];
}


export async function updateTask(taskId: string, workspaceId: string, data: Partial<NewTask>): Promise<Task> {
  const result = await db
    .update(tasks)
    .set(data)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning();
  return result[0];
}

export async function deleteTask(taskId: string, workspaceId: string): Promise<boolean> {
  const result = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .returning({ id: tasks.id });
  return result.length > 0;
}
