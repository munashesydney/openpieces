import type { ToolDefinition } from "ai";
import type { ToolContext } from "@/lib/tools/registry";
import { secretsToolDefinition } from "./definition";
import { executeSecrets } from "./execute";

export function createSecretsTool(context: ToolContext): ToolDefinition {
  return {
    description: secretsToolDefinition.description,
    parameters: secretsToolDefinition.inputSchema,
    execute: async (input: unknown) => {
      return executeSecrets(secretsToolDefinition.inputSchema.parse(input), context);
    },
  };
}

