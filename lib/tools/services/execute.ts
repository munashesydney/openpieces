import {
  getServices,
  getServicesByWorkflowId,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceLogs,
  validateServiceForSpawn,
  resetSpawnFailCount,
  decrementQaSpawnCount,
} from "@/lib/services/service.service";
import { enqueueServiceSpawn } from "@/lib/queues/pg-boss";
import type { ToolContext } from "@/lib/tools/registry";
import type { ServiceToolInput } from "./definition";

export async function executeService(
  input: ServiceToolInput,
  context: ToolContext,
) {
  const {
    action,
    serviceId,
    workflowId,
    page,
    limit,
    createDetails,
    updateDetails,
    maxLines,
  } = input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  switch (action) {
    case "list": {
      if (workflowId) {
        const data = await getServicesByWorkflowId(workflowId, workspaceId);
        return { data, total: data.length };
      }
      return await getServices(workspaceId, page ?? 1, limit ?? 10);
    }

    case "get": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'get'");
      }
      const service = await getServiceById(serviceId, workspaceId);
      if (!service) {
        throw new Error(`Service not found: ${serviceId}`);
      }
      return service;
    }

    case "create": {
      if (!createDetails) {
        throw new Error("createDetails is required for action 'create'");
      }
      if (!createDetails.title?.trim()) {
        throw new Error("createDetails.title is required for action 'create'");
      }
      if (createDetails.type === "trigger" && !createDetails.workflowId) {
        throw new Error(
          "createDetails.workflowId is required when type is 'trigger'",
        );
      }
      if (createDetails.type === "action" && createDetails.workflowId) {
        throw new Error(
          "Action services are standalone and cannot be assigned to a workflow.",
        );
      }
      if (!createDetails.directory?.trim()) {
        throw new Error(
          "createDetails.directory is required for action 'create'",
        );
      }
      return await createService({
        workspaceId,
        title: createDetails.title,
        description: createDetails.description ?? "",
        type: createDetails.type,
        runtime: createDetails.runtime as "deno" | "podman" | undefined,
        workflowId: createDetails.workflowId ?? null,
        directory: createDetails.directory.trim(),
      } as Parameters<typeof createService>[0]);
    }

    case "update": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'update'");
      }
      if (!updateDetails || Object.keys(updateDetails).length === 0) {
        throw new Error(
          "updateDetails with at least one field is required for action 'update'",
        );
      }
      const updated = await updateService(serviceId, workspaceId, {
        ...(updateDetails.title !== undefined && {
          title: updateDetails.title,
        }),
        ...(updateDetails.description !== undefined && {
          description: updateDetails.description,
        }),
        ...(updateDetails.type !== undefined && { type: updateDetails.type }),
        ...(updateDetails.runtime !== undefined && {
          runtime: updateDetails.runtime,
        }),
        ...(updateDetails.workflowId !== undefined && {
          workflowId: updateDetails.workflowId || null,
        }),
        ...(updateDetails.directory !== undefined && {
          directory: updateDetails.directory.trim() || null,
        }),
      } as Parameters<typeof updateService>[2]);
      if (!updated) {
        throw new Error(`Service not found or update failed: ${serviceId}`);
      }
      return updated;
    }

    case "delete": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'delete'");
      }
      const deleted = await deleteService(serviceId, workspaceId);
      if (!deleted) {
        throw new Error(`Service not found or delete failed: ${serviceId}`);
      }
      return { success: true, deleted: serviceId };
    }

    case "get_logs": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'get_logs'");
      }
      return await getServiceLogs(serviceId, workspaceId, maxLines);
    }

    case "redeploy": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'redeploy'");
      }
      const validation = await validateServiceForSpawn(serviceId, workspaceId);
      if (!validation.valid) {
        throw new Error(`Service cannot be redeployed: ${validation.error}`);
      }
      await enqueueServiceSpawn({ serviceId, workspaceId });

      // Decrement qa_spawn_count — user/AI explicitly redeployed, so free one slot
      await decrementQaSpawnCount(serviceId);

      return { success: true, redeployed: serviceId };
    }

    case "reset_spawn_count": {
      if (!serviceId) {
        throw new Error("serviceId is required for action 'reset_spawn_count'");
      }
      const updated = await resetSpawnFailCount(serviceId, workspaceId);
      return { success: true, spawnFailCount: updated.spawnFailCount };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, get, create, update, delete, get_logs, redeploy, reset_spawn_count.`,
      );
    }
  }
}
