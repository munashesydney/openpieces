import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { serviceToolDefinition } from "./definition";
import { executeService } from "./execute";

export function createServiceTool(context: ToolContext) {
  return tool({
    ...serviceToolDefinition,
    execute: (input) => executeService(input, context),
  });
}
