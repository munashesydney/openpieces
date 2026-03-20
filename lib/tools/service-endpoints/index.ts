import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { endpointsToolDefinition } from "./definition";
import { executeEndpoints } from "./execute";

export function createEndpointsTool(context: ToolContext) {
  return tool({
    ...endpointsToolDefinition,
    execute: (input) => executeEndpoints(input, context),
  });
}
