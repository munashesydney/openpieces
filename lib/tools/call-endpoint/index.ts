import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { callEndpointToolDefinition } from "./definition";
import { executeCallEndpoint } from "./execute";

export function createCallEndpointTool(context: ToolContext) {
  return tool({
    ...callEndpointToolDefinition,
    execute: (input) => executeCallEndpoint(input, context),
  });
}
