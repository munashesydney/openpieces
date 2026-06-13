"use server";

import { revalidatePath } from "next/cache";
import {
  createWebhook,
  deleteWebhook,
  toggleWebhook,
} from "@/lib/services/webhook.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export async function createWebhookAction(
  workspaceId: string,
  formData: FormData,
) {
  try {
    const { workspace } = await requireWorkspaceOwner(workspaceId);
    const orgId = workspace.orgId || "s";

    const url = formData.get("url") as string;
    const events = formData.getAll("events") as string[];

    if (!url || events.length === 0) {
      return { error: "URL and at least one event are required." };
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return { error: "Invalid URL format." };
    }

    const { webhook, secret } = await createWebhook(workspaceId, url, events);
    
    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/settings/webhooks`);
    return { webhook, secret };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteWebhookAction(
  workspaceId: string,
  webhookId: string,
) {
  try {
    const { workspace } = await requireWorkspaceOwner(workspaceId);
    const orgId = workspace.orgId || "s";
    
    await deleteWebhook(workspaceId, webhookId);
    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/settings/webhooks`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleWebhookAction(
  workspaceId: string,
  webhookId: string,
  isActive: boolean,
) {
  try {
    const { workspace } = await requireWorkspaceOwner(workspaceId);
    const orgId = workspace.orgId || "s";
    
    await toggleWebhook(workspaceId, webhookId, isActive);
    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/settings/webhooks`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
