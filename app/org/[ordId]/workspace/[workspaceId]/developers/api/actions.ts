"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import {
  createApiKey,
  deleteApiKey,
  revealApiKey,
} from "@/lib/services/api-key.service";
import type { ApiKey } from "@/lib/services/api-key.service";
import { ValidationError } from "@/lib/errors/validation-error";

export type ActionResult = { error: string } | { success: true };

export async function createApiKeyAction(
  workspaceId: string,
  formData: FormData,
): Promise<
  ActionResult | { success: true; plaintextKey: string; apiKey: ApiKey }
> {
  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  const name = (formData.get("name") as string)?.trim();

  try {
    const result = await createApiKey({
      workspaceId,
      userId: user.id,
      name,
    });
    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/developers/api`);
    return {
      success: true,
      plaintextKey: result.plaintextKey,
      apiKey: result.apiKey,
    };
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    console.error("Unexpected error creating API key:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function deleteApiKeyAction(
  workspaceId: string,
  keyId: string,
): Promise<ActionResult> {
  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    const deleted = await deleteApiKey(keyId, workspaceId, user.id);
    if (!deleted) {
      return { error: "API key not found." };
    }
    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/developers/api`);
    return { success: true };
  } catch (err) {
    console.error("Unexpected error deleting API key:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function revealApiKeyAction(
  workspaceId: string,
  keyId: string,
): Promise<{ error: string } | { success: true; plaintextKey: string }> {
  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  const plaintext = await revealApiKey(keyId, workspaceId, user.id);
  if (plaintext === null) {
    return { error: "API key not found or could not be decrypted." };
  }

  return { success: true, plaintextKey: plaintext };
}
