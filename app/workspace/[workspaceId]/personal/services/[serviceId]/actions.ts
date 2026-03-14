"use server";

import { revalidatePath } from "next/cache";
import { createEndpoint, updateEndpoint, deleteEndpoint } from "../../../../../../lib/services/service-endpoint.service";
import { requireWorkspaceOwner } from "../../../../../../lib/services/auth.service";
import { getServiceById } from "../../../../../../lib/services/service.service";

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
