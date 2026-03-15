import { createWorkflowTool } from "@/lib/tools/workflows";
import { createServiceTool } from "@/lib/tools/services";
import { createTaskTool } from "@/lib/tools/tasks";

export type ToolContext = {
  workspaceId: string;
  userId: string;
  chatId: string;
};

export function createTools(context: ToolContext) {
  return {
    manage_workflows: createWorkflowTool(context),
    manage_services: createServiceTool(context),
    manage_tasks: createTaskTool(context),
  };
}
