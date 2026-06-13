"use server";

import { revalidatePath } from "next/cache";
import {
  getWebhookDeliveries,
  retryWebhookDelivery,
} from "@/lib/services/webhook.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export async function retryWebhookDeliveryAction(
  workspaceId: string,
  deliveryId: string
) {
  try {
    const { workspace } = await requireWorkspaceOwner(workspaceId);
    const orgId = workspace.orgId || "s";

    await retryWebhookDelivery(workspaceId, deliveryId);

    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/developers/workbench`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getWebhookDeliveriesAction(
  workspaceId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    await requireWorkspaceOwner(workspaceId);
    const deliveries = await getWebhookDeliveries(workspaceId, limit, offset);
    return { deliveries };
  } catch (error: any) {
    return { error: error.message };
  }
}
