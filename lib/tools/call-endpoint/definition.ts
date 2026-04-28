import { z } from "zod";

export const callEndpointToolDefinition = {
  name: "call_endpoint",
  description:
    "Call an HTTP endpoint on a running action service. Validates input against the endpoint's inputSchema before calling.",
  inputSchema: z.object({
    endpointId: z.string().describe("The endpoint ID to call"),
    pathParams: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "Path parameter values to substitute in the path (e.g. { id: '123' } for /users/:id)",
      ),
    body: z
      .unknown()
      .optional()
      .describe(
        'JSON body as a native object (not a string!). Pass it directly — do NOT JSON.stringify() it. Example: { "name": "my-service", "port": 8080 }',
      ),
    query: z
      .record(z.string(), z.string())
      .optional()
      .describe("Query string parameters for GET requests"),
  }),
};

export type CallEndpointInput = z.infer<
  typeof callEndpointToolDefinition.inputSchema
>;
