import {
  getTasks,
  getTasksByWorkflowId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/services/task.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { TaskToolInput } from "./definition";

export async function executeTask(input: TaskToolInput, context: ToolContext) {
  const {
    action,
    taskId,
    workflowId,
    page,
    limit,
    createDetails,
    updateDetails,
  } = input;
  const { workspaceId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  switch (action) {
    case "list": {
      if (workflowId) {
        const data = await getTasksByWorkflowId(workflowId, workspaceId);
        return { data, total: data.length };
      }
      return await getTasks(workspaceId, page ?? 1, limit ?? 10);
    }

    case "get": {
      if (!taskId) {
        throw new Error("taskId is required for action 'get'");
      }
      const task = await getTaskById(taskId, workspaceId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      return task;
    }

    case "create": {
      if (!createDetails) {
        throw new Error("createDetails is required for action 'create'");
      }
      if (!createDetails.title?.trim()) {
        throw new Error("createDetails.title is required for action 'create'");
      }
      if (!createDetails.workflowId) {
        throw new Error("createDetails.workflowId is required for all tasks");
      }
      if (createDetails.type === "recurring" && !createDetails.intervalType) {
        throw new Error(
          "createDetails.intervalType is required when type is 'recurring'",
        );
      }
      return await createTask({
        workspaceId,
        title: createDetails.title,
        description: createDetails.description ?? "",
        type: createDetails.type,
        workflowId: createDetails.workflowId,
        status: createDetails.status ?? "active",
        scheduledAt: createDetails.scheduledAt
          ? new Date(createDetails.scheduledAt)
          : null,
        intervalType: createDetails.intervalType ?? null,
        intervalValue: createDetails.intervalValue ?? null,
        dayOfWeek: createDetails.dayOfWeek ?? null,
        dayOfMonth: createDetails.dayOfMonth ?? null,
        timeOfDay: createDetails.timeOfDay ?? null,
        timeWindowStart: createDetails.timeWindowStart ?? null,
        timeWindowEnd: createDetails.timeWindowEnd ?? null,
        timezone: createDetails.timezone ?? "UTC",
      });
    }

    case "update": {
      if (!taskId) {
        throw new Error("taskId is required for action 'update'");
      }
      if (!updateDetails || Object.keys(updateDetails).length === 0) {
        throw new Error(
          "updateDetails with at least one field is required for action 'update'",
        );
      }
      const updated = await updateTask(taskId, workspaceId, {
        ...(updateDetails.title !== undefined && {
          title: updateDetails.title,
        }),
        ...(updateDetails.description !== undefined && {
          description: updateDetails.description,
        }),
        ...(updateDetails.type !== undefined && { type: updateDetails.type }),
        ...(updateDetails.status !== undefined && {
          status: updateDetails.status,
        }),
        ...(updateDetails.workflowId !== undefined && {
          workflowId: updateDetails.workflowId || null,
        }),
        ...(updateDetails.scheduledAt !== undefined && {
          scheduledAt: updateDetails.scheduledAt
            ? new Date(updateDetails.scheduledAt)
            : null,
        }),
        ...(updateDetails.intervalType !== undefined && {
          intervalType: updateDetails.intervalType || null,
        }),
        ...(updateDetails.intervalValue !== undefined && {
          intervalValue: updateDetails.intervalValue || null,
        }),
        ...(updateDetails.dayOfWeek !== undefined && {
          dayOfWeek: updateDetails.dayOfWeek ?? null,
        }),
        ...(updateDetails.dayOfMonth !== undefined && {
          dayOfMonth: updateDetails.dayOfMonth ?? null,
        }),
        ...(updateDetails.timeOfDay !== undefined && {
          timeOfDay: updateDetails.timeOfDay || null,
        }),
        ...(updateDetails.timeWindowStart !== undefined && {
          timeWindowStart: updateDetails.timeWindowStart || null,
        }),
        ...(updateDetails.timeWindowEnd !== undefined && {
          timeWindowEnd: updateDetails.timeWindowEnd || null,
        }),
        ...(updateDetails.timezone !== undefined && {
          timezone: updateDetails.timezone || "UTC",
        }),
      });
      if (!updated) {
        throw new Error(`Task not found or update failed: ${taskId}`);
      }
      return updated;
    }

    case "delete": {
      if (!taskId) {
        throw new Error("taskId is required for action 'delete'");
      }
      const deleted = await deleteTask(taskId, workspaceId);
      if (!deleted) {
        throw new Error(`Task not found or delete failed: ${taskId}`);
      }
      return { success: true, deleted: taskId };
    }

    default: {
      throw new Error(
        `Unknown action: ${action}. Valid actions are: list, get, create, update, delete.`,
      );
    }
  }
}
