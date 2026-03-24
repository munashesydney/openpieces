import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { brainToolDefinition } from "./definition";
import { executeBrainTool } from "./execute";

export function createBrainTool(context: ToolContext) {
  return tool({
    ...brainToolDefinition,
    execute: (input) => executeBrainTool(input, context),
  });
}
