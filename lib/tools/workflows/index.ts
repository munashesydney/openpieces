import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { workflowToolDefinition } from "./definition";
import { executeWorkflow } from "./execute";

export function createWorkflowTool(context: ToolContext) {
  return tool({
    ...workflowToolDefinition,
    execute: (input) => executeWorkflow(input, context),
  });
}
