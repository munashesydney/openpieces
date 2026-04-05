import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { webSearchToolDefinition } from "./definition";
import { executeWebSearchTool } from "./execute";

export function createWebSearchTool(context: ToolContext) {
  return tool({
    ...webSearchToolDefinition,
    execute: (input) => executeWebSearchTool(input, context),
  });
}