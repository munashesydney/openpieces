"use server";

import { revalidatePath } from "next/cache";
import { createService, deleteService } from "../../../../../lib/services/service.service";
import { requireUser } from "../../../../../lib/services/auth.service";
import { ValidationError } from "../../../../../lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createServiceAction(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { error: "Unauthorized." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) ?? "";
  const workflowIdStr = formData.get("workflowId") as string | null;
  const workflowId = workflowIdStr || null;
  const type = formData.get("type") as "trigger" | "action";

  try {
    await createService({ workspaceId, workflowId, title, description, type });
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error creating service:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/services`);
  return { success: true };
}

export async function deleteServiceAction(workspaceId: string, serviceId: string) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  await deleteService(serviceId, workspaceId);
  revalidatePath(`/workspace/${workspaceId}/personal/services`);
}
