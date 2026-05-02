"use server";

import { revalidatePath } from "next/cache";
import {
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  getEndpointsByServiceId,
} from "../../../../../../lib/services/service-endpoint.service";
import {
  requireWorkspaceOwner,
  requireUser,
} from "../../../../../../lib/services/auth.service";
import {
  getServiceById,
  validateServiceForSpawn,
  resetSpawnFailCount,
  decrementQaSpawnCount,
} from "../../../../../../lib/services/service.service";
import {
  enqueueServiceSpawn,
  enqueueServiceStop,
} from "../../../../../../lib/queues/pg-boss";
import { ValidationError } from "../../../../../../lib/errors/validation-error";
import {
  getRequiredSecrets,
  addRequiredSecret,
  removeRequiredSecret,
} from "../../../../../../lib/services/service-required-secrets.service";
import { createSecret } from "../../../../../../lib/services/secret.service";

export type ActionResult = { error: string } | { success: true };

export async function spawnServiceAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const validation = await validateServiceForSpawn(serviceId, workspaceId);
  if (!validation.valid) return { error: validation.error };

  await enqueueServiceSpawn({ serviceId, workspaceId });

  // Decrement qa_spawn_count — user-triggered deploy frees one QA slot
  await decrementQaSpawnCount(serviceId);

  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function stopServiceAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };
  if (!service.pid) return { error: "Service is not running" };

  await enqueueServiceStop({ serviceId, workspaceId });
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function createEndpointAction(
  workspaceId: string,
  serviceId: string,
  formData: FormData,
) {
  await requireWorkspaceOwner(workspaceId);
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

  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function updateEndpointAction(
  workspaceId: string,
  serviceId: string,
  endpointId: string,
  formData: FormData,
) {
  await requireWorkspaceOwner(workspaceId);
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

  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function deleteEndpointAction(
  workspaceId: string,
  serviceId: string,
  endpointId: string,
) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const deleted = await deleteEndpoint(endpointId, serviceId, workspaceId);
  if (!deleted) throw new Error("Endpoint not found");
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function addRequiredSecretAction(
  workspaceId: string,
  serviceId: string,
  secretKey: string,
) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  await addRequiredSecret(serviceId, secretKey);
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function removeRequiredSecretAction(
  workspaceId: string,
  serviceId: string,
  id: string,
) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  await removeRequiredSecret(id);
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function getRequiredSecretsAction(
  workspaceId: string,
  serviceId: string,
) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  return getRequiredSecrets(serviceId);
}

export async function resetSpawnCountAction(
  workspaceId: string,
  serviceId: string,
): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  await resetSpawnFailCount(serviceId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

import {
  getStoredToken,
  getAuthorizeUrl,
  pushPiece,
  fetchPieceById,
  downloadPieceZip,
} from "@/lib/services/hub.service";
import {
  downloadServiceCode,
  writeServiceCode,
  updateServiceMetadata,
} from "@/lib/services/service.service";

export type HubActionResult =
  | { error: string }
  | { redirectUrl: string }
  | { success: true };

export async function pushToHubAction(
  workspaceId: string,
  serviceId: string,
): Promise<HubActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  let token = await getStoredToken();
  if (!token) {
    const currentUrl = `/workspace/${workspaceId}/personal/services/${serviceId}`;
    const authUrl = getAuthorizeUrl();
    const redirectUrl = `${authUrl}&state=${encodeURIComponent(currentUrl)}`;
    return { redirectUrl };
  }

  // Zip the actual service directory
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

  const result = await pushPiece(token, {
    title: service.title,
    description: service.description,
    zipBuffer,
    filename: `${service.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`,
    endpoints: endpoints.map((e) => ({
      method: e.method,
      path: e.path,
      description: e.description,
      inputSchema: e.inputSchema ?? {},
    })),
    requiredSecrets: secrets.map((s) => ({ secretKey: s.secretKey })),
  });

  if (!result.ok) return { error: result.error ?? "Failed to push piece" };

  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
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
  await requireWorkspaceOwner(workspaceId);

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };

  let token = await getStoredToken();
  if (!token) {
    const currentUrl = `/workspace/${workspaceId}/personal/services/${serviceId}`;
    const authUrl = getAuthorizeUrl();
    const redirectUrl = `${authUrl}&state=${encodeURIComponent(currentUrl)}`;
    return { redirectUrl };
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

  // 2. Download the ZIP
  const zipBuffer = await downloadPieceZip(piece.codeUrl);
  if (!zipBuffer) {
    return { error: "Failed to download piece code" };
  }

  // 3. Extract ZIP into the service's directory
  if (!service.directory?.trim()) {
    return { error: "Service has no directory set" };
  }

  try {
    await writeServiceCode(service.directory, zipBuffer);
  } catch (err) {
    return { error: `Failed to write service code: ${(err as Error).message}` };
  }

  // 4. Update service title and description
  try {
    await updateServiceMetadata(serviceId, workspaceId, {
      title: piece.title,
      description: piece.description,
    });
  } catch (err) {
    return { error: `Failed to update service: ${(err as Error).message}` };
  }

  // 5. Insert endpoints from the hub piece
  if (piece.endpoints && piece.endpoints.length > 0) {
    try {
      await Promise.all(
        piece.endpoints.map((ep) =>
          createEndpoint({
            serviceId,
            method: ep.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
            path: ep.path,
            description: ep.description ?? "",
            inputSchema: (ep.inputSchema ?? {}) as Record<string, unknown>,
          }),
        ),
      );
    } catch (err) {
      return { error: `Failed to add endpoints: ${(err as Error).message}` };
    }
  }

  // 6. Insert required secrets from the hub piece
  if (piece.requiredSecrets && piece.requiredSecrets.length > 0) {
    try {
      const user = await requireUser();

      await Promise.all(
        piece.requiredSecrets.map(async (s) => {
          // Ensure the secret exists in the workspace (create with empty value if needed)
          try {
            await createSecret({
              workspaceId,
              userId: user.id,
              key: s.secretKey,
              value: "",
              allowEmptyValue: true,
            });
          } catch {
            // Secret already exists — that's fine, continue
          }

          // Now add it as a required secret for this service
          await addRequiredSecret(serviceId, s.secretKey);
        }),
      );
    } catch (err) {
      return {
        error: `Failed to add required secrets: ${(err as Error).message}`,
      };
    }
  }

  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}
