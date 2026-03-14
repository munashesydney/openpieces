import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { serviceEndpoints, type NewServiceEndpoint, type ServiceEndpoint } from "../db/schema";
import { isValidUuid } from "../utils/uuid";

export async function getEndpointsByServiceId(serviceId: string): Promise<ServiceEndpoint[]> {
  if (!isValidUuid(serviceId)) return [];
  return db.select().from(serviceEndpoints).where(eq(serviceEndpoints.serviceId, serviceId));
}

export async function createEndpoint(data: NewServiceEndpoint): Promise<ServiceEndpoint> {
  const result = await db.insert(serviceEndpoints).values(data).returning();
  return result[0];
}

export async function updateEndpoint(endpointId: string, data: Partial<NewServiceEndpoint>): Promise<ServiceEndpoint> {
  const result = await db
    .update(serviceEndpoints)
    .set(data)
    .where(eq(serviceEndpoints.id, endpointId))
    .returning();
  return result[0];
}

export async function deleteEndpoint(endpointId: string): Promise<boolean> {
  const result = await db
    .delete(serviceEndpoints)
    .where(eq(serviceEndpoints.id, endpointId))
    .returning({ id: serviceEndpoints.id });
  return result.length > 0;
}
