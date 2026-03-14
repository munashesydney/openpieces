import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import { services, type NewService, type Service } from "../db/schema";
import { isValidUuid } from "../utils/uuid";

export async function getServices(workspaceId: string, page: number = 1, pageSize: number = 10): Promise<{ data: Service[], total: number }> {
  if (!isValidUuid(workspaceId)) return { data: [], total: 0 };

  const offset = (page - 1) * pageSize;
  
  const [data, totalResult] = await Promise.all([
    db.select()
      .from(services)
      .where(eq(services.workspaceId, workspaceId))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() })
      .from(services)
      .where(eq(services.workspaceId, workspaceId))
  ]);

  return {
    data,
    total: totalResult[0].count,
  };
}

export async function getServiceById(serviceId: string, workspaceId: string): Promise<Service | null> {
  if (!isValidUuid(serviceId) || !isValidUuid(workspaceId)) return null;

  const result = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
    .limit(1);
  return result[0] ?? null;
}

export async function createService(data: NewService): Promise<Service> {
  const result = await db.insert(services).values(data).returning();
  return result[0];
}

export async function updateService(serviceId: string, workspaceId: string, data: Partial<NewService>): Promise<Service> {
  const result = await db
    .update(services)
    .set(data)
    .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
    .returning();
  return result[0];
}

export async function deleteService(serviceId: string, workspaceId: string): Promise<boolean> {
  const result = await db
    .delete(services)
    .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
    .returning({ id: services.id });
  return result.length > 0;
}
