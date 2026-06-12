"use server";

import { revalidatePath } from "next/cache";
import {
  createService,
  deleteService,
  getServiceById,
} from "@/lib/services/service.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import { enqueueServiceStop } from "@/lib/queues/pg-boss";
import { ValidationError } from "@/lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createServiceAction(
  workspaceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string) ?? "";
  const workflowIdStr = formData.get("workflowId") as string | null;
  const workflowId = workflowIdStr || null;
  const type = formData.get("type") as "trigger" | "action";
  const runtime = (formData.get("runtime") as string) || "deno";
  const directory = (formData.get("directory") as string)?.trim() || null;

  try {
    await createService({
      workspaceId,
      workflowId,
      title,
      description,
      type,
      runtime,
      directory,
    } as Parameters<typeof createService>[0]);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error creating service:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services`);
  return { success: true };
}

export async function deleteServiceAction(
  workspaceId: string,
  serviceId: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  // Stop the service first if it's running, so the process doesn't get orphaned
  const service = await getServiceById(serviceId, workspaceId);
  if (service && service.status === "running") {
    await enqueueServiceStop({ serviceId, workspaceId });
    // Direct kill for immediate cleanup (worker will also attempt)
    if (service.pid) {
      try {
        process.kill(service.pid, "SIGTERM");
      } catch {
        // Process may already be gone
      }
    }
  }

  await deleteService(serviceId, workspaceId);
  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/services`);
}
