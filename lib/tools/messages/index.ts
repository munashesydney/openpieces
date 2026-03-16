import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { messagesToolDefinition } from "./definition";
import { executeMessages } from "./execute";

export function createMessagesTool(context: ToolContext) {
  return tool({
    ...messagesToolDefinition,
    execute: (input) => executeMessages(input, context),
  });
}
