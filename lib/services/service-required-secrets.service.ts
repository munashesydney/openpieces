import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { serviceRequiredSecrets, type NewServiceRequiredSecret, type ServiceRequiredSecret } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { ValidationError } from "../errors/validation-error";

export async function addRequiredSecret(serviceId: string, secretKey: string): Promise<ServiceRequiredSecret> {
  if (!isValidUuid(serviceId)) {
    throw new ValidationError("Invalid service ID.");
  }

  if (!secretKey || secretKey.trim() === "") {
    throw new ValidationError("Secret key is required.");
  }

  const trimmedKey = secretKey.trim().toUpperCase();

  // Check if already exists
  const existing = await db
    .select()
    .from(serviceRequiredSecrets)
    .where(and(eq(serviceRequiredSecrets.serviceId, serviceId), eq(serviceRequiredSecrets.secretKey, trimmedKey)))
    .limit(1);

  if (existing.length > 0) {
    throw new ValidationError(`Secret "${trimmedKey}" is already required for this service.`);
  }

  const result = await db
    .insert(serviceRequiredSecrets)
    .values({ serviceId, secretKey: trimmedKey })
    .returning();

  return result[0];
}

export async function getRequiredSecrets(serviceId: string): Promise<ServiceRequiredSecret[]> {
  if (!isValidUuid(serviceId)) {
    return [];
  }

  return db
    .select()
    .from(serviceRequiredSecrets)
    .where(eq(serviceRequiredSecrets.serviceId, serviceId));
}

export async function removeRequiredSecret(id: string): Promise<boolean> {
  if (!isValidUuid(id)) {
    throw new ValidationError("Invalid required secret ID.");
  }

  const result = await db
    .delete(serviceRequiredSecrets)
    .where(eq(serviceRequiredSecrets.id, id))
    .returning({ id: serviceRequiredSecrets.id });

  return result.length > 0;
}

export async function getRequiredSecretsByServiceIds(serviceIds: string[]): Promise<Record<string, ServiceRequiredSecret[]>> {
  if (serviceIds.length === 0) {
    return {};
  }

  const validIds = serviceIds.filter(isValidUuid);
  if (validIds.length === 0) {
    return {};
  }

  const rows = await db
    .select()
    .from(serviceRequiredSecrets)
    .where(
      // @ts-expect-error - drizzle or expression
      serviceRequiredSecrets.serviceId.in(validIds)
    );

  return rows.reduce((acc, row) => {
    if (!acc[row.serviceId]) {
      acc[row.serviceId] = [];
    }
    acc[row.serviceId].push(row);
    return acc;
  }, {} as Record<string, ServiceRequiredSecret[]>);
}