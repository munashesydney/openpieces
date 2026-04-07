import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { createRuntimeToolDefinition, type RuntimeToolInput } from "./definition";
import { executeRuntime } from "./execute";

export function createRuntimeTool(context: ToolContext) {
  const def = createRuntimeToolDefinition(context.agentType);
  // Runtime schema is one of three Zod objects; AI SDK infers `never` if we union them without a widen.
  return tool({
    ...def,
    inputSchema: def.inputSchema as Parameters<typeof tool>[0] extends { inputSchema: infer S }
      ? S
      : never,
    execute: (input: RuntimeToolInput) => executeRuntime(input, context),
  });
}
