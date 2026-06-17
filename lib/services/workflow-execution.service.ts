import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  workflowExecutions,
  type NewWorkflowExecution,
  type WorkflowExecution,
} from "@/lib/db/schema";
import { isValidUuid } from "../utils/uuid";
import { getWorkflowsForEvent } from "./event.service";

export async function createWorkflowExecution(
  data: NewWorkflowExecution,
): Promise<WorkflowExecution> {
  const [execution] = await db
    .insert(workflowExecutions)
    .values(data)
    .returning();
  return execution!;
}

/**
 * Fires an event to all subscribed workflows, creating a workflow execution
 * for each. Returns an array of created executions.
 */
export async function createWorkflowExecutionsForEvent(
  eventId: string,
  workspaceId: string,
  eventPayload?: Record<string, unknown> | null,
): Promise<{ workflowId: string; execution: WorkflowExecution }[]> {
  const subscribedWorkflows = await getWorkflowsForEvent(eventId);

  if (subscribedWorkflows.length === 0) return [];

  const results: { workflowId: string; execution: WorkflowExecution }[] = [];

  for (const sub of subscribedWorkflows) {
    const execution = await createWorkflowExecution({
      workspaceId,
      workflowId: sub.workflowId,
      eventId,
      eventPayload: eventPayload ?? null,
      triggerType: "event",
      status: "pending",
    });
    results.push({ workflowId: sub.workflowId, execution });
  }

  return results;
}

export async function updateWorkflowExecutionByChatId(
  chatId: string,
  status: WorkflowExecution["status"],
  result?: string | null,
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
  workspaceId: string,
): Promise<WorkflowExecution[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];

  return db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.workflowId, workflowId),
        eq(workflowExecutions.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(workflowExecutions.createdAt));
}
