import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { taskToolDefinition } from "./definition";
import { executeTask } from "./execute";

export function createTaskTool(context: ToolContext) {
  return tool({
    ...taskToolDefinition,
    execute: (input) => executeTask(input, context),
  });
}
