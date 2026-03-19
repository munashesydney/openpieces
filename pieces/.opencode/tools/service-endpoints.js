import { tool } from "@opencode-ai/plugin";

export const manageServiceEndpoints = tool({
  description:
    "Manage HTTP endpoints for the current OpenPieces service. Supports list, get, create, update, delete. Use workspaceId and serviceId from OPENPIECES_CONTEXT. list: serviceId+workspaceId. get/update/delete: endpointId. create: method (GET/POST/PUT/DELETE/PATCH), path, optional description. Pass all fields as a single JSON string in the 'input' argument.",
  args: {
    input: tool.schema
      .string()
      .describe(
        'JSON object: action (required, one of: list/get/create/update/delete), workspaceId (required), serviceId (required), endpointId (for get/update/delete), method (for create/update), path (for create/update), description (optional for create/update)'
      ),
  },
  async execute(args) {
    const baseUrl =
      process.env.OPENPIECES_INTERNAL_URL ||
      process.env.OPENPIECES_APP_URL ||
      "http://app:3000";

    const internalSecret = process.env.INTERNAL_API_KEY;
    if (!internalSecret) {
      return "Error: INTERNAL_API_KEY is not set in the OpenCode environment.";
    }

    let parsed;
    try {
      parsed = JSON.parse(args.input);
    } catch {
      return "Error: input must be a valid JSON string.";
    }

    const validActions = ["list", "get", "create", "update", "delete"];
    if (!validActions.includes(parsed.action)) {
      return `Error: Invalid action "${parsed.action}". Valid: ${validActions.join(", ")}`;
    }

    const body = {
      action: parsed.action,
      workspaceId: parsed.workspaceId,
      serviceId: parsed.serviceId,
    };

    if (parsed.endpointId) body.endpointId = parsed.endpointId;
    if (parsed.method) body.method = parsed.method;
    if (parsed.path) body.path = parsed.path;
    if (parsed.description != null) body.description = parsed.description;

    try {
      const response = await fetch(`${baseUrl}/api/service-endpoints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return `Error: Invalid response from server: ${text.slice(0, 200)}`;
      }

      if (!response.ok) {
        return `Error (${response.status}): ${data.error || "Unknown error"}`;
      }

      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error: ${err.message || "Failed to reach the OpenPieces API"}`;
    }
  },
});
