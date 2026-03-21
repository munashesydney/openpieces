"use server";

import { revalidatePath } from "next/cache";
import { createEndpoint, updateEndpoint, deleteEndpoint } from "../../../../../../lib/services/service-endpoint.service";
import { requireWorkspaceOwner } from "../../../../../../lib/services/auth.service";
import { getServiceById, validateServiceForSpawn } from "../../../../../../lib/services/service.service";
import { enqueueServiceSpawn, enqueueServiceStop } from "../../../../../../lib/queues/pg-boss";
import { addRequiredSecret, removeRequiredSecret, getRequiredSecrets } from "../../../../../../lib/services/service-required-secrets.service";

export type ActionResult = { error: string } | { success: true };

export async function spawnServiceAction(workspaceId: string, serviceId: string): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const validation = await validateServiceForSpawn(serviceId, workspaceId);
  if (!validation.valid) return { error: validation.error };

  await enqueueServiceSpawn({ serviceId, workspaceId });
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function stopServiceAction(workspaceId: string, serviceId: string): Promise<ActionResult> {
  await requireWorkspaceOwner(workspaceId);

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) return { error: "Service not found" };
  if (!service.pid) return { error: "Service is not running" };

  await enqueueServiceStop({ serviceId, workspaceId });
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
  return { success: true };
}

export async function createEndpointAction(workspaceId: string, serviceId: string, formData: FormData) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const method = formData.get("method") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
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

export async function updateEndpointAction(workspaceId: string, serviceId: string, endpointId: string, formData: FormData) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const method = formData.get("method") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
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

export async function deleteEndpointAction(workspaceId: string, serviceId: string, endpointId: string) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  const deleted = await deleteEndpoint(endpointId, serviceId, workspaceId);
  if (!deleted) throw new Error("Endpoint not found");
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function addRequiredSecretAction(workspaceId: string, serviceId: string, secretKey: string) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  await addRequiredSecret(serviceId, secretKey);
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function removeRequiredSecretAction(workspaceId: string, serviceId: string, id: string) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  await removeRequiredSecret(id);
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function getRequiredSecretsAction(workspaceId: string, serviceId: string) {
  await requireWorkspaceOwner(workspaceId);
  const service = await getServiceById(serviceId, workspaceId);
  if (!service) throw new Error("Service not found");

  return getRequiredSecrets(serviceId);
}