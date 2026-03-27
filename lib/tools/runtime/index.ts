import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { runtimeToolDefinition } from "./definition";
import { executeRuntime } from "./execute";

export function createRuntimeTool(context: ToolContext) {
  return tool({
    ...runtimeToolDefinition,
    execute: (input) => executeRuntime(input, context),
  });
}
