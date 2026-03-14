import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import { workflows, services, tasks, type NewWorkflow, type Workflow } from "../db/schema";
import { isValidUuid } from "../utils/uuid";

export async function getWorkflows(
  workspaceId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: Workflow[]; total: number }> {
  if (!isValidUuid(workspaceId)) return { data: [], total: 0 };

  const offset = (page - 1) * pageSize;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(workflows)
      .where(eq(workflows.workspaceId, workspaceId))
      .limit(pageSize)
      .offset(offset)
      .orderBy(workflows.createdAt),
    db
      .select({ count: count() })
      .from(workflows)
      .where(eq(workflows.workspaceId, workspaceId)),
  ]);

  return {
    data,
    total: totalResult[0].count,
  };
}

export async function getWorkflowById(
  workflowId: string,
  workspaceId: string
): Promise<Workflow | null> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return null;

  const result = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId)))
    .limit(1);

  return result[0] ?? null;
}

export async function createWorkflow(data: NewWorkflow): Promise<Workflow> {
  const result = await db.insert(workflows).values(data).returning();
  return result[0];
}

export async function updateWorkflow(
  workflowId: string,
  workspaceId: string,
  data: Partial<NewWorkflow>
): Promise<Workflow> {
  const result = await db
    .update(workflows)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId)))
    .returning();
  return result[0];
}

export async function deleteWorkflow(
  workflowId: string,
  workspaceId: string
): Promise<boolean> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return false;

  const deleted = await db.transaction(async (tx) => {
    // Delete all services linked to this workflow
    await tx
      .delete(services)
      .where(and(eq(services.workflowId, workflowId), eq(services.workspaceId, workspaceId)));

    // Delete all tasks linked to this workflow
    await tx
      .delete(tasks)
      .where(and(eq(tasks.workflowId, workflowId), eq(tasks.workspaceId, workspaceId)));

    // Now delete the workflow itself
    const result = await tx
      .delete(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.workspaceId, workspaceId)))
      .returning({ id: workflows.id });

    return result.length > 0;
  });

  return deleted;
}
