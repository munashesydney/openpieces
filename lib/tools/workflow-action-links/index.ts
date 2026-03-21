import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { workflowActionLinksToolDefinition } from "./definition";
import { executeWorkflowActionLinks } from "./execute";

export function createWorkflowActionLinksTool(context: ToolContext) {
  return tool({
    ...workflowActionLinksToolDefinition,
    execute: (input) => executeWorkflowActionLinks(input, context),
  });
}
