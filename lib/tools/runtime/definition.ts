import { z } from "zod";

export const runtimeToolDefinition = {
  name: "runtime",
  description: "Runtime operations for the workspace, such as sleeping for a specified duration.",
  inputSchema: z.object({
    action: z
      .enum(["sleep"])
      .describe("The action to perform"),
    seconds: z
      .number()
      .positive()
      .describe("Number of seconds to sleep"),
  }),
};

export type RuntimeToolInput = z.infer<typeof runtimeToolDefinition.inputSchema>;
