import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  serviceRequiredSecrets,
  services,
  secrets,
  type NewServiceRequiredSecret,
  type ServiceRequiredSecret,
} from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { ValidationError } from "../errors/validation-error";

export async function addRequiredSecret(
  serviceId: string,
  secretKey: string,
): Promise<ServiceRequiredSecret> {
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
    .where(
      and(
        eq(serviceRequiredSecrets.serviceId, serviceId),
        eq(serviceRequiredSecrets.secretKey, trimmedKey),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ValidationError(
      `Secret "${trimmedKey}" is already required for this service.`,
    );
  }

  // Look up the service to find its workspace
  const serviceRows = await db
    .select({ workspaceId: services.workspaceId })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  if (serviceRows.length === 0) {
    throw new ValidationError("Service not found.");
  }

  const workspaceId = serviceRows[0].workspaceId;

  // Verify the secret actually exists in this workspace
  const secretRows = await db
    .select({ id: secrets.id })
    .from(secrets)
    .where(
      and(eq(secrets.workspaceId, workspaceId), eq(secrets.key, trimmedKey)),
    )
    .limit(1);

  if (secretRows.length === 0) {
    throw new ValidationError(
      `Secret "${trimmedKey}" does not exist in this workspace. Create the secret first.`,
    );
  }

  const result = await db
    .insert(serviceRequiredSecrets)
    .values({ serviceId, secretKey: trimmedKey })
    .returning();

  return result[0];
}

export async function getRequiredSecrets(
  serviceId: string,
): Promise<ServiceRequiredSecret[]> {
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

export async function getRequiredSecretsByServiceIds(
  serviceIds: string[],
): Promise<Record<string, ServiceRequiredSecret[]>> {
  if (serviceIds.length === 0) {
    return {};
  }

  const validIds = serviceIds.filter(isValidUuid);
  if (validIds.length === 0) {
    return {};
  }

  const rows = await db.select().from(serviceRequiredSecrets).where(
    // @ts-expect-error - drizzle or expression
    serviceRequiredSecrets.serviceId.in(validIds),
  );

  return rows.reduce(
    (acc, row) => {
      if (!acc[row.serviceId]) {
        acc[row.serviceId] = [];
      }
      acc[row.serviceId].push(row);
      return acc;
    },
    {} as Record<string, ServiceRequiredSecret[]>,
  );
}

export async function getServicesByRequiredSecretKey(
  secretKey: string,
): Promise<ServiceRequiredSecret[]> {
  const trimmed = secretKey.trim().toUpperCase();
  return db
    .select()
    .from(serviceRequiredSecrets)
    .where(eq(serviceRequiredSecrets.secretKey, trimmed));
}

export async function respawnServicesUsingSecret(
  workspaceId: string,
  secretKey: string,
) {
  const { enqueueServiceSpawn } = await import("@/lib/queues/pg-boss");
  const { validateServiceForSpawn } = await import("./service.service");

  const servicesUsingSecret = await getServicesByRequiredSecretKey(secretKey);
  const uniqueServiceIds = [
    ...new Set(servicesUsingSecret.map((s) => s.serviceId)),
  ];

  await Promise.all(
    uniqueServiceIds.map(async (serviceId) => {
      const validation = await validateServiceForSpawn(serviceId, workspaceId);
      if (validation.valid) {
        await enqueueServiceSpawn({ serviceId, workspaceId });
      }
    }),
  );
}

export async function deleteRequiredSecretsByServiceId(serviceId: string) {
  if (!isValidUuid(serviceId)) return;
  await db
    .delete(serviceRequiredSecrets)
    .where(eq(serviceRequiredSecrets.serviceId, serviceId));
}
