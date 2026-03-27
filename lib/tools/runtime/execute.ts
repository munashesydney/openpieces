import type { ToolContext } from "@/lib/tools/registry";
import type { RuntimeToolInput } from "./definition";

export async function executeRuntime(input: RuntimeToolInput, context: ToolContext) {
  const { action, seconds } = input;

  switch (action) {
    case "sleep": {
      const ms = seconds * 1000;
      await new Promise((resolve) => setTimeout(resolve, ms));
      return { success: true, sleptSeconds: seconds };
    }
    default: {
      throw new Error(`Unknown action: ${action}. Valid actions are: sleep.`);
    }
  }
}
