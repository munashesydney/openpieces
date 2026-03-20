import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  serviceEndpoints,
  services,
  type NewServiceEndpoint,
  type ServiceEndpoint,
} from "../db/schema";
import { isValidUuid } from "../utils/uuid";

export async function getEndpointsByServiceId(
  serviceId: string,
  workspaceId: string
): Promise<ServiceEndpoint[]> {
  if (!isValidUuid(serviceId) || !isValidUuid(workspaceId)) return [];
  return db
    .select({ endpoint: serviceEndpoints })
    .from(serviceEndpoints)
    .innerJoin(services, eq(serviceEndpoints.serviceId, services.id))
    .where(and(eq(serviceEndpoints.serviceId, serviceId), eq(services.workspaceId, workspaceId)))
    .then((rows) => rows.map((row) => row.endpoint));
}

export async function getEndpointById(
  endpointId: string,
  serviceId: string,
  workspaceId: string
): Promise<ServiceEndpoint | null> {
  if (!isValidUuid(endpointId) || !isValidUuid(serviceId) || !isValidUuid(workspaceId)) {
    return null;
  }
  const [row] = await db
    .select({ endpoint: serviceEndpoints })
    .from(serviceEndpoints)
    .innerJoin(services, eq(serviceEndpoints.serviceId, services.id))
    .where(
      and(
        eq(serviceEndpoints.id, endpointId),
        eq(serviceEndpoints.serviceId, serviceId),
        eq(services.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row?.endpoint ?? null;
}

export async function getEndpointByIdForWorkspace(
  endpointId: string,
  workspaceId: string
): Promise<ServiceEndpoint | null> {
  if (!isValidUuid(endpointId) || !isValidUuid(workspaceId)) {
    return null;
  }
  const [row] = await db
    .select({ endpoint: serviceEndpoints })
    .from(serviceEndpoints)
    .innerJoin(services, eq(serviceEndpoints.serviceId, services.id))
    .where(
      and(
        eq(serviceEndpoints.id, endpointId),
        eq(services.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row?.endpoint ?? null;
}

export async function createEndpoint(data: NewServiceEndpoint): Promise<ServiceEndpoint> {
  const result = await db.insert(serviceEndpoints).values(data).returning();
  return result[0];
}

export async function updateEndpoint(
  endpointId: string,
  serviceId: string,
  workspaceId: string,
  data: Partial<NewServiceEndpoint>
): Promise<ServiceEndpoint | null> {
  if (!isValidUuid(endpointId) || !isValidUuid(serviceId) || !isValidUuid(workspaceId)) {
    return null;
  }

  const [existing] = await db
    .select({ id: serviceEndpoints.id })
    .from(serviceEndpoints)
    .innerJoin(services, eq(serviceEndpoints.serviceId, services.id))
    .where(
      and(
        eq(serviceEndpoints.id, endpointId),
        eq(serviceEndpoints.serviceId, serviceId),
        eq(services.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  const result = await db
    .update(serviceEndpoints)
    .set(data)
    .where(eq(serviceEndpoints.id, endpointId))
    .returning();
  return result[0] ?? null;
}

export async function deleteEndpoint(
  endpointId: string,
  serviceId: string,
  workspaceId: string
): Promise<boolean> {
  if (!isValidUuid(endpointId) || !isValidUuid(serviceId) || !isValidUuid(workspaceId)) {
    return false;
  }

  const [existing] = await db
    .select({ id: serviceEndpoints.id })
    .from(serviceEndpoints)
    .innerJoin(services, eq(serviceEndpoints.serviceId, services.id))
    .where(
      and(
        eq(serviceEndpoints.id, endpointId),
        eq(serviceEndpoints.serviceId, serviceId),
        eq(services.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!existing) {
    return false;
  }

  const result = await db
    .delete(serviceEndpoints)
    .where(eq(serviceEndpoints.id, endpointId))
    .returning({ id: serviceEndpoints.id });
  return result.length > 0;
}
