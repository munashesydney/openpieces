import { z } from "zod";

export const endpointsToolDefinition = {
  name: "manage_service_endpoints",
  description:
    "Manage HTTP endpoints for OpenPieces services. Use to list endpoints registered by a service, or get details of a specific endpoint.\n\n[NOTE: You cannot CREATE service endpoints. Only Opencode can. Ask Opencode via message if you need one created.]",
  inputSchema: z.object({
    action: z
      .enum(["list", "get"])
      .describe("The action to perform"),
    serviceId: z
      .string()
      .describe("The service ID to list endpoints for"),
    endpointId: z
      .string()
      .optional()
      .describe("Endpoint ID. Required for get action."),
  }),
};

export type EndpointsToolInput = z.infer<typeof endpointsToolDefinition.inputSchema>;
