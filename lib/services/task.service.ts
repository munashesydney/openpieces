import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { tasks, type NewTask, type Task } from "../db/schema";
import { isValidUuid } from "../utils/uuid";

export async function getTasks(workspaceId: string): Promise<Task[]> {
  if (!isValidUuid(workspaceId)) return [];
  return db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId));
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
