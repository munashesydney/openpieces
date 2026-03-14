"use server";

import { revalidatePath } from "next/cache";
import { createService, deleteService } from "../../../../../lib/services/service.service";
import { requireUser } from "../../../../../lib/services/auth.service";

export async function createServiceAction(workspaceId: string, formData: FormData) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const workflowIdStr = formData.get("workflowId") as string | null;
  const workflowId = workflowIdStr ? workflowIdStr : null;
  const type = formData.get("type") as "trigger" | "action";

  await createService({
    workspaceId,
    workflowId,
    title,
    description,
    type,
  });

  revalidatePath(`/workspace/${workspaceId}/personal/services`);
}

export async function deleteServiceAction(workspaceId: string, serviceId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  await deleteService(serviceId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/services`);
}
