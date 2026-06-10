"use server";

import { revalidatePath } from "next/cache";
import {
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  getEndpointsByServiceId,
} from "@/lib/services/service-endpoint.service";
import {
  requireWorkspaceOwner,
  requireUser,
} from "@/lib/services/auth.service";
import {
  getServiceById,
  validateServiceForSpawn,
  resetSpawnFailCount,
  decrementQaSpawnCount,
} from "@/lib/services/service.service";
import { enqueueServiceSpawn, enqueueServiceStop } from "@/lib/queues/pg-boss";
import { ValidationError } from "@/lib/errors/validation-error";
import {
  getRequiredSecrets,
  addRequiredSecret,
  removeRequiredSecret,
} from "@/lib/services/service-required-secrets.service";

export type ActionResult = { error: string } | { success: true };

export async function spawnServiceAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const validation = await validateServiceForSpawn(serviceId, workspaceId);
  if (!validation.valid) return { error: validation.error };

  await enqueueServiceSpawn({ serviceId, workspaceId });

  // Decrement qa_spawn_count — user-triggered deploy frees one QA slot
  await decrementQaSpawnCount(serviceId);

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function stopServiceAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };
  if (service.status !== "running") return { error: "Service is not running" };

  await enqueueServiceStop({ serviceId, workspaceId });
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function createEndpointAction(
  workspaceId: string,
  serviceId: string,
  formData: FormData,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const method = formData.get("method") as
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH";
  const path = formData.get("path") as string;
  const description = formData.get("description") as string;

  await createEndpoint({
    serviceId,
    method,
    path,
    description,
  });

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function updateEndpointAction(
  workspaceId: string,
  serviceId: string,
  endpointId: string,
  formData: FormData,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const method = formData.get("method") as
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH";
  const path = formData.get("path") as string;
  const description = formData.get("description") as string;

  const endpoint = await updateEndpoint(endpointId, serviceId, workspaceId, {
    method,
    path,
    description,
  });

  if (!endpoint) throw new Error("Endpoint not found");

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function deleteEndpointAction(
  workspaceId: string,
  serviceId: string,
  endpointId: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const deleted = await deleteEndpoint(endpointId, serviceId, workspaceId);
  if (!deleted) throw new Error("Endpoint not found");
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function addRequiredSecretAction(
  workspaceId: string,
  serviceId: string,
  secretKey: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  await addRequiredSecret(serviceId, secretKey);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function removeRequiredSecretAction(
  workspaceId: string,
  serviceId: string,
  id: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  await removeRequiredSecret(id);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function getRequiredSecretsAction(
  workspaceId: string,
  serviceId: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  return getRequiredSecrets(serviceId);
}

export async function resetSpawnCountAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  await resetSpawnFailCount(serviceId, workspaceId);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

import {
  getStoredToken,
  getAuthorizeUrl,
  pushPiece,
  fetchPieceById,
} from "@/lib/services/hub.service";
import {
  createService,
  downloadServiceCode,
  writeServiceCode,
  updateServiceMetadata,
} from "@/lib/services/service.service";

export type HubActionResult =
  | { error: string }
  | { redirectUrl: string }
  | { success: true; hubPieceId?: string }
  | { notOwner: true };

export async function pushToHubAction(
  workspaceId: string,
  serviceId: string,
  asFork?: boolean,
): Promise<HubActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  const token = await getStoredToken();
  if (!token) {
    const currentUrl = `/workspace/${workspaceId}/personal/services/${serviceId}`;
    const authUrl = getAuthorizeUrl();
    const redirectUrl = `${authUrl}&state=${encodeURIComponent(currentUrl)}`;
    return { redirectUrl };
  }

  let zipBuffer: Buffer;
  try {
    zipBuffer = await downloadServiceCode(serviceId, workspaceId);
  } catch (err) {
    const message =
      err instanceof ValidationError
        ? err.message
        : "Failed to read service code";
    return { error: message };
  }

  // Fetch endpoints and required secrets to include in the push
  const [endpoints, secrets] = await Promise.all([
    getEndpointsByServiceId(serviceId, workspaceId),
    getRequiredSecrets(serviceId),
  ]);

  const title =
    asFork && service.hubPieceId ? `${service.title} - Copy` : service.title;

  let cleanHubPieceId = service.hubPieceId;
  if (asFork) {
    cleanHubPieceId = null;
    // Update local service title + clear hub link
    await updateServiceMetadata(serviceId, workspaceId, {
      title,
      hubPieceId: null,
    });
  }

  const result = await pushPiece(token, {
    title,
    description: service.description,
    zipBuffer,
    filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`,
    pieceId: cleanHubPieceId ?? undefined,
    category: service.type === "trigger" ? "TRIGGER" : "ACTION",
    endpoints: endpoints.map((e) => ({
      method: e.method,
      path: e.path,
      description: e.description,
      inputSchema: e.inputSchema ?? {},
    })),
    requiredSecrets: secrets.map((s) => ({ secretKey: s.secretKey })),
  });

  if (result.notOwner) {
    return { notOwner: true };
  }

  if (!result.ok) return { error: result.error ?? "Failed to push piece" };

  // Store the hub piece id and timestamp back on the local service
  await updateServiceMetadata(serviceId, workspaceId, {
    hubPieceId: result.hubPieceId ?? null,
    hubUpdatedAt: result.hubUpdatedAt
      ? new Date(result.hubUpdatedAt)
      : undefined,
  });

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export type PullFromHubResult =
  | { error: string }
  | { redirectUrl: string }
  | { success: true };

/**
 * Pull a piece from the hub by its UUID:
 * 1. Fetches the piece metadata (title, description, codeUrl)
 * 2. Downloads the ZIP archive
 * 3. Extracts it into the service's directory
 * 4. Updates the service's title and description
 */
export async function pullFromHubAction(
  workspaceId: string,
  serviceId: string,
  pieceId: string,
): Promise<PullFromHubResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  const token = await getStoredToken();
  if (!token) {
    const currentUrl = `/workspace/${workspaceId}/personal/services/${serviceId}`;
    const authUrl = getAuthorizeUrl();
    const redirectUrl = `${authUrl}&state=${encodeURIComponent(currentUrl)}`;
    return { redirectUrl };
  }

  if (!service.directory?.trim()) {
    return { error: "Service has no directory set" };
  }

  // 1. Fetch the piece from the hub
  const piece = await fetchPieceById(pieceId);
  if (!piece) {
    return { error: "Piece not found on hub" };
  }

  // Type safety check — hub piece category must match service type
  if (piece.category.toLowerCase() !== service.type) {
    return {
      error: `Type mismatch: service is "${service.type}" but hub piece is "${piece.category.toLowerCase()}"`,
    };
  }

  // 2. Sync piece data into the local service (code, endpoints, secrets, metadata)
  try {
    const user = await requireUser();
    const { syncPieceToLocalService } =
      await import("@/lib/services/hub-workflow.service");
    await syncPieceToLocalService(
      piece,
      { serviceId, directory: service.directory, workspaceId },
      user.id,
    );
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function forkServiceLocallyAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  // Generate a unique directory slug for the fork
  const baseSlug = service.directory?.split("/").pop() || "service";
  const forkSlug = `${baseSlug}-copy-${Date.now().toString(36)}`;

  // Create the forked service record (this also creates the directory on disk)
  const newService = await createService({
    workspaceId,
    title: `${service.title} - Copy`,
    description: service.description,
    type: service.type,
    directory: forkSlug,
    workflowId: service.workflowId,
  });

  // Copy files from the original service directory to the new one
  try {
    const zipBuffer = await downloadServiceCode(serviceId, workspaceId);
    await writeServiceCode(newService.directory!, zipBuffer, {
      serviceId: newService.id,
      workspaceId,
    });
  } catch (err) {
    // Clean up the new service record on failure
    const { deleteService } = await import("@/lib/services/service.service");
    await deleteService(newService.id, workspaceId).catch(() => {});
    return { error: `Failed to copy service code: ${(err as Error).message}` };
  }

  // Copy endpoints
  const endpoints = await getEndpointsByServiceId(serviceId, workspaceId);
  await Promise.all(
    endpoints.map((ep) =>
      createEndpoint({
        serviceId: newService.id,
        method: ep.method,
        path: ep.path,
        description: ep.description,
        inputSchema: (ep.inputSchema ?? {}) as Record<string, unknown>,
      }),
    ),
  );

  // Copy required secrets (silently skip any that don't exist in workspace)
  const secrets = await getRequiredSecrets(serviceId);
  await Promise.all(
    secrets.map((s) =>
      addRequiredSecret(newService.id, s.secretKey).catch(() => {}),
    ),
  );

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services`);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}
