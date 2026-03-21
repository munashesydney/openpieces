import { z } from "zod";

export const workflowActionLinksToolDefinition = {
  name: "manage_workflow_action_links",
  description:
    "Link or unlink action services to/from workflows. Use 'list_linked' to see which action services are connected to a workflow. Only services with type 'action' can be linked to workflows.",
  inputSchema: z.object({
    action: z
      .enum(["link", "unlink", "list_linked"])
      .describe("The action to perform"),
    workflowId: z
      .string()
      .describe("Workflow ID. Required for all actions."),
    actionServiceId: z
      .string()
      .optional()
      .describe("Action service ID. Required for 'link' and 'unlink' actions."),
  }),
};

export type WorkflowActionLinksToolInput = z.infer<typeof workflowActionLinksToolDefinition.inputSchema>;
