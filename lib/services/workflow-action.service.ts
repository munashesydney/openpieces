import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { services, workflowActionServices, type Service } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { ValidationError } from "../errors/validation-error";

export async function linkActionServiceToWorkflow(
  workflowId: string,
  actionServiceId: string,
  workspaceId: string
): Promise<void> {
  if (!isValidUuid(workflowId)) {
    throw new ValidationError(`Invalid workflow ID: ${workflowId}`);
  }
  if (!isValidUuid(actionServiceId)) {
    throw new ValidationError(`Invalid action service ID: ${actionServiceId}`);
  }

  // Verify the action service exists and is type 'action'
  const service = await db
    .select()
    .from(services)
    .where(and(eq(services.id, actionServiceId), eq(services.workspaceId, workspaceId)))
    .limit(1);

  if (service.length === 0) {
    throw new ValidationError("Action service not found in this workspace.");
  }

  if (service[0].type !== "action") {
    throw new ValidationError("Only action services can be linked to workflows.");
  }

  // Check if already linked
  const existing = await db
    .select()
    .from(workflowActionServices)
    .where(
      and(
        eq(workflowActionServices.workflowId, workflowId),
        eq(workflowActionServices.actionServiceId, actionServiceId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ValidationError("This action service is already linked to this workflow.");
  }

  await db.insert(workflowActionServices).values({
    workflowId,
    actionServiceId,
  });
}

export async function unlinkActionServiceFromWorkflow(
  workflowId: string,
  actionServiceId: string
): Promise<void> {
  if (!isValidUuid(workflowId)) {
    throw new ValidationError(`Invalid workflow ID: ${workflowId}`);
  }
  if (!isValidUuid(actionServiceId)) {
    throw new ValidationError(`Invalid action service ID: ${actionServiceId}`);
  }

  await db
    .delete(workflowActionServices)
    .where(
      and(
        eq(workflowActionServices.workflowId, workflowId),
        eq(workflowActionServices.actionServiceId, actionServiceId)
      )
    );
}

export async function getActionServicesForWorkflow(
  workflowId: string,
  workspaceId: string
): Promise<Service[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) {
    return [];
  }

  const result = await db
    .select({ service: services })
    .from(workflowActionServices)
    .innerJoin(services, eq(workflowActionServices.actionServiceId, services.id))
    .where(eq(workflowActionServices.workflowId, workflowId));

  return result
    .map((row) => row.service)
    .filter((service) => service.workspaceId === workspaceId);
}

export async function getWorkflowsForActionService(
  actionServiceId: string
): Promise<string[]> {
  if (!isValidUuid(actionServiceId)) {
    return [];
  }

  const result = await db
    .select({ workflowId: workflowActionServices.workflowId })
    .from(workflowActionServices)
    .where(eq(workflowActionServices.actionServiceId, actionServiceId));

  return result.map((row) => row.workflowId);
}
