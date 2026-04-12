import { getSecrets, getSecretById, createSecret, updateSecret, deleteSecret } from "@/lib/services/secret.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { SecretsToolInput } from "./definition";

/** Masks secret values returned to the model (first 3 chars + ***). */
function maskSecretValueForDisplay(value: string): string {
  if (!value) {
    return "***";
  }
  return `${value.slice(0, 3)}***`;
}

export async function executeSecrets(input: SecretsToolInput, context: ToolContext) {
  const { action, secretId, page, limit, updateDetails } = input;
  const { workspaceId, userId } = context;

  if (!workspaceId || !userId) {
    throw new Error("Workspace ID and user ID are required in context");
  }

  switch (action) {
    case "list": {
      const result = await getSecrets(workspaceId, userId, page ?? 1, limit ?? 50);
      return {
        ...result,
        data: result.data.map((secret) => ({
          ...secret,
          value: maskSecretValueForDisplay(secret.value),
        })),
      };
    }

    case "get": {
      if (!secretId) {
        throw new Error("secretId is required for action 'get'");
      }
      const secret = await getSecretById(secretId, workspaceId, userId);
      if (!secret) {
        throw new Error(`Secret not found: ${secretId}`);
      }
      return {
        ...secret,
        value: maskSecretValueForDisplay(secret.value),
      };
    }

    case "update": {
      if (!secretId) {
        throw new Error("secretId is required for action 'update'");
      }
      if (!updateDetails || (!updateDetails.key && !updateDetails.value)) {
        throw new Error("updateDetails.key or updateDetails.value is required for action 'update'");
      }

      // Fetch current secret to fill in missing fields
      const existing = await getSecretById(secretId, workspaceId, userId);
      if (!existing) {
        throw new Error(`Secret not found: ${secretId}`);
      }

      const key = (updateDetails.key ?? existing.key).trim();
      const value = updateDetails.value ?? existing.value;

      return await updateSecret({
        id: secretId,
        workspaceId,
        userId,
        key,
        value,
      });
    }

    case "delete": {
      if (!secretId) {
        throw new Error("secretId is required for action 'delete'");
      }
      const deleted = await deleteSecret(secretId, workspaceId, userId);
      if (!deleted) {
        throw new Error(`Secret not found or delete failed: ${secretId}`);
      }
      return { success: true, deleted: secretId };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, get, create, update, delete.`
      );
    }
  }
}

