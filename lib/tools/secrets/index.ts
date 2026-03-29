import { tool } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { secretsToolDefinition } from "./definition";
import { executeSecrets } from "./execute";

export function createSecretsTool(context: ToolContext) {
  return tool({
    ...secretsToolDefinition,
    execute: (input) => executeSecrets(secretsToolDefinition.inputSchema.parse(input), context),
  });
}

