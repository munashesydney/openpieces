import { z } from "zod";

const serviceTypeEnum = z.enum(["trigger", "action"]);
const runtimeEnum = z.enum(["deno", "podman"]);

export const serviceToolDefinition = {
  name: "manage_services",
  description:
    "Manage services in the workspace. Use to list services, get one by id, list by workflow, create, update, delete, or redeploy a service. Services can be type 'trigger' (requires workflowId) or 'action' (standalone, linked to workflows via workflow_action_services). Directory is required when creating a service (used for OpenCode sessions).",
  inputSchema: z.object({
    action: z
      .enum([
        "list",
        "get",
        "create",
        "update",
        "delete",
        "get_logs",
        "redeploy",
        "reset_spawn_count",
      ])
      .describe("The action to perform"),
    serviceId: z
      .string()
      .optional()
      .describe(
        "Service ID. Required for get, update, delete, get_logs, and redeploy actions.",
      ),
    workflowId: z
      .string()
      .optional()
      .describe(
        "Workflow ID. Optional for list (filter by workflow). Required in createDetails when type is 'trigger'. Not allowed for 'action' services.",
      ),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for list action"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Number of items per page for list action"),
    createDetails: z
      .object({
        title: z.string().describe("Title of the service"),
        description: z
          .string()
          .optional()
          .describe("Description of the service"),
        type: serviceTypeEnum.describe(
          "Service type: trigger or action. Trigger requires workflowId. Action services are standalone.",
        ),
        workflowId: z
          .string()
          .optional()
          .describe(
            "Workflow ID. Required when type is 'trigger'. Not allowed when type is 'action'.",
          ),
        directory: z
          .string()
          .describe(
            "Directory path for the service. Required for OpenCode sessions.",
          ),
        runtime: runtimeEnum
          .optional()
          .describe(
            'Runtime for the service. "deno" (default) for TypeScript/JS, "podman" for container-based pieces (Python, Next.js, Go, etc.).',
          ),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        type: serviceTypeEnum
          .optional()
          .describe("New type: trigger or action"),
        workflowId: z.string().optional().describe("New workflow ID"),
        directory: z
          .string()
          .optional()
          .describe("New directory path for OpenCode sessions"),
        runtime: runtimeEnum.optional().describe("New runtime: deno or podman"),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
    maxLines: z
      .number()
      .optional()
      .default(50)
      .describe(
        "Maximum number of log lines to return for get_logs action. Max 50.",
      ),
  }),
};

export type ServiceToolInput = z.infer<
  typeof serviceToolDefinition.inputSchema
>;
