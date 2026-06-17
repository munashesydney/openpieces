"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  subscribeWorkflowToEvent,
  unsubscribeWorkflowFromEvent,
} from "@/lib/services/event.service";
import { ValidationError } from "@/lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export async function createEventAction(
  workspaceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const eventName = (formData.get("eventName") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!eventName) {
    return { error: "Event name is required." };
  }

  try {
    await createEvent({
      workspaceId,
      eventName,
      description,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return { error: err.message };
    }
    if (isPgUniqueViolation(err)) {
      return {
        error: `An event named "${eventName}" already exists in this workspace.`,
      };
    }
    console.error("Unexpected error creating event:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/events`);
  return { success: true };
}

export async function updateEventAction(
  workspaceId: string,
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const eventName = (formData.get("eventName") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!eventName) {
    return { error: "Event name is required." };
  }

  try {
    await updateEvent(eventId, workspaceId, {
      eventName,
      description,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return { error: err.message };
    }
    if (isPgUniqueViolation(err)) {
      return {
        error: `An event named "${eventName}" already exists in this workspace.`,
      };
    }
    console.error("Unexpected error updating event:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/events`);
  return { success: true };
}

export async function deleteEventAction(
  workspaceId: string,
  eventId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    await deleteEvent(eventId, workspaceId);
  } catch (err) {
    console.error("Unexpected error deleting event:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/events`);
  return { success: true };
}

export async function subscribeWorkflowToEventAction(
  workspaceId: string,
  workflowId: string,
  eventId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    await subscribeWorkflowToEvent(workflowId, eventId, workspaceId);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    if (isPgUniqueViolation(err)) {
      return { error: "This workflow is already subscribed to this event." };
    }
    console.error("Unexpected error subscribing to event:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/events`);
  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}

export async function unsubscribeWorkflowFromEventAction(
  workspaceId: string,
  workflowId: string,
  eventId: string,
): Promise<ActionResult> {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    await unsubscribeWorkflowFromEvent(workflowId, eventId);
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error unsubscribing from event:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal/events`);
  revalidatePath(
    `/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflowId}`,
  );
  return { success: true };
}
