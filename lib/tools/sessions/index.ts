import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { sessionsToolDefinition } from "./definition";
import { executeSessions } from "./execute";

export function createSessionsTool(context: ToolContext) {
  return tool({
    ...sessionsToolDefinition,
    execute: (input) => executeSessions(input, context),
  });
}
