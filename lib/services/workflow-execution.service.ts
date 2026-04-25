import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutions, type NewWorkflowExecution, type WorkflowExecution } from "@/lib/db/schema";
import { isValidUuid } from "../utils/uuid";

export async function createWorkflowExecution(
  data: NewWorkflowExecution
): Promise<WorkflowExecution> {
  const [execution] = await db
    .insert(workflowExecutions)
    .values(data)
    .returning();
  return execution!;
}

export async function updateWorkflowExecutionByChatId(
  chatId: string,
  status: WorkflowExecution["status"],
  result?: string | null
): Promise<void> {
  if (!isValidUuid(chatId)) return;

  await db
    .update(workflowExecutions)
    .set({
      status,
      result: result ?? null,
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.chatId, chatId));
}

export async function getWorkflowExecutions(
  workflowId: string,
  workspaceId: string
): Promise<WorkflowExecution[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];

  return db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.workflowId, workflowId),
        eq(workflowExecutions.workspaceId, workspaceId)
      )
    )
    .orderBy(desc(workflowExecutions.createdAt));
}
