"use server";

import { revalidatePath } from "next/cache";
import { createEndpoint, updateEndpoint, deleteEndpoint } from "../../../../../../lib/services/service-endpoint.service";
import { requireUser } from "../../../../../../lib/services/auth.service";

export async function createEndpointAction(workspaceId: string, serviceId: string, formData: FormData) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

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
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const method = formData.get("method") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  const path = formData.get("path") as string;
  const description = formData.get("description") as string;

  await updateEndpoint(endpointId, {
    method,
    path,
    description,
  });

  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}

export async function deleteEndpointAction(workspaceId: string, serviceId: string, endpointId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  await deleteEndpoint(endpointId);
  revalidatePath(`/workspace/${workspaceId}/personal/services/${serviceId}`);
}
