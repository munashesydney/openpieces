import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import { services, workflows, type NewService, type Service } from "../db/schema";
import { isValidUuid } from "../utils/uuid";
import { ValidationError } from "../errors/validation-error";
import { getBaseUrl, buildServiceUrl } from "../utils/url";

const VALID_SERVICE_TYPES = ["trigger", "action"] as const;

export async function createService(data: NewService): Promise<Service> {
  // ── Validate title ────────────────────────────────────────────────────────
  if (!data.title || data.title.trim() === "") {
    throw new ValidationError("Title is required.");
  }

  // ── Validate directory ────────────────────────────────────────────────────
  if (!data.directory || data.directory.trim() === "") {
    throw new ValidationError("Directory is required.");
  }

  const directory = data.directory.trim();
  // Directory must be a single word (no paths, no spaces)
  if (directory.includes("/") || directory.includes("\\") || directory.includes(" ")) {
    throw new ValidationError("Directory must be a single word without slashes or spaces.");
  }
  // Don't allow leading dots or special prefixes
  if (directory.startsWith(".") || directory.startsWith("-") || directory.startsWith("_")) {
    throw new ValidationError("Directory must start with a letter or number.");
  }
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(directory)) {
    throw new ValidationError("Directory can only contain letters, numbers, hyphens, and underscores.");
  }

  // ── Validate type ─────────────────────────────────────────────────────────
  if (!VALID_SERVICE_TYPES.includes(data.type as typeof VALID_SERVICE_TYPES[number])) {
    throw new ValidationError(
      `Invalid service type "${data.type}". Must be one of: ${VALID_SERVICE_TYPES.join(", ")}.`
    );
  }

  // ── Validate workflowId ───────────────────────────────────────────────────
  // Required for triggers; not allowed for actions (they are standalone)
  if (data.type === "trigger" && !data.workflowId) {
    throw new ValidationError("A workflow is required when creating a trigger service.");
  }

  if (data.type === "action" && data.workflowId) {
    throw new ValidationError("Action services are standalone and cannot be assigned to a workflow. Use the workflow's action links instead.");
  }

  if (data.workflowId) {
    if (!isValidUuid(data.workflowId)) {
      throw new ValidationError(
        `The provided workflow ID "${data.workflowId}" is not a valid ID.`
      );
    }

    // Verify the workflow actually exists in this workspace
    const workflow = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(
        and(
          eq(workflows.id, data.workflowId),
          eq(workflows.workspaceId, data.workspaceId)
        )
      )
      .limit(1);

    if (workflow.length === 0) {
      throw new ValidationError(
        "The selected workflow does not exist in this workspace."
      );
    }
  }

  const result = await db.insert(services).values(data).returning();
  return result[0];
}


export async function getServices(workspaceId: string, page: number = 1, pageSize: number = 10): Promise<{ data: (Service & { url: string })[], total: number }> {
  if (!isValidUuid(workspaceId)) return { data: [], total: 0 };

  const offset = (page - 1) * pageSize;
  const baseUrl = getBaseUrl();

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
    data: data.map((service) => ({
      ...service,
      url: buildServiceUrl(baseUrl, service.id),
    })),
    total: totalResult[0].count,
  };
}

export async function getServicesByWorkflowId(workflowId: string, workspaceId: string): Promise<(Service & { url: string })[]> {
  if (!isValidUuid(workflowId) || !isValidUuid(workspaceId)) return [];
  const baseUrl = getBaseUrl();
  const data = await db
    .select()
    .from(services)
    .where(and(eq(services.workflowId, workflowId), eq(services.workspaceId, workspaceId)));
  return data.map((service) => ({
    ...service,
    url: buildServiceUrl(baseUrl, service.id),
  }));
}

export async function getServiceByIdOnly(serviceId: string): Promise<Service | null> {
  if (!isValidUuid(serviceId)) return null;
  const result = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  return result[0] ?? null;
}

export async function getServiceById(serviceId: string, workspaceId: string): Promise<(Service & { url: string }) | null> {
  if (!isValidUuid(serviceId) || !isValidUuid(workspaceId)) return null;

  const baseUrl = getBaseUrl();
  const result = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
    .limit(1);
  if (!result[0]) return null;
  return {
    ...result[0],
    url: buildServiceUrl(baseUrl, result[0].id),
  };
}



export async function updateService(
  serviceId: string,
  workspaceId: string,
  data: Partial<NewService>,
  updateSource: "user" | "system" = "user"
): Promise<Service> {
  const result = await db
    .update(services)
    .set({ ...data, updateSource })
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

export async function validateServiceForSpawn(serviceId: string, workspaceId: string): Promise<{ valid: true } | { valid: false; error: string }> {
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { valid: false, error: "Service not found" };
  if (!service.directory?.trim()) return { valid: false, error: "Service has no directory set" };

  const { getRequiredSecrets } = await import("./service-required-secrets.service");
  const { getSecrets } = await import("./secret.service");
  const { getWorkspaceOwnerId } = await import("./workspace.service");

  const requiredSecrets = await getRequiredSecrets(serviceId);
  if (requiredSecrets.length > 0) {
    const workspaceOwnerId = (await getWorkspaceOwnerId(workspaceId)) ?? "";
    const { data: secrets } = await getSecrets(workspaceId, workspaceOwnerId, 1, 500);
    const secretKeys = new Set(secrets.map((s) => s.key));

    const missingSecrets = requiredSecrets
      .filter((req) => !secretKeys.has(req.secretKey))
      .map((req) => req.secretKey);

    if (missingSecrets.length > 0) {
      return { valid: false, error: `Missing required secrets: ${missingSecrets.join(", ")}` };
    }
  }

  return { valid: true };
}
