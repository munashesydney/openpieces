"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import {
  createSecret,
  deleteSecret,
  updateSecret,
} from "@/lib/services/secret.service";
import { ValidationError } from "@/lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createSecretAction(
  workspaceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireWorkspaceOwner(workspaceId);

  const key = (formData.get("key") as string)?.trim();
  const value = (formData.get("value") as string) ?? "";

  try {
    await createSecret({
      workspaceId,
      userId: user.id,
      key,
      value,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return { error: err.message };
    }
    console.error("Unexpected error creating secret:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/secrets`);
  return { success: true };
}

export async function updateSecretAction(
  workspaceId: string,
  secretId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireWorkspaceOwner(workspaceId);

  const key = (formData.get("key") as string)?.trim();
  const value = (formData.get("value") as string) ?? "";

  try {
    await updateSecret({
      id: secretId,
      workspaceId,
      userId: user.id,
      key,
      value,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return { error: err.message };
    }
    console.error("Unexpected error updating secret:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/workspace/${workspaceId}/personal/secrets`);
  return { success: true };
}

export async function deleteSecretAction(
  workspaceId: string,
  secretId: string,
): Promise<void> {
  const { user } = await requireWorkspaceOwner(workspaceId);
  await deleteSecret(secretId, workspaceId, user.id);
  revalidatePath(`/workspace/${workspaceId}/personal/secrets`);
}
