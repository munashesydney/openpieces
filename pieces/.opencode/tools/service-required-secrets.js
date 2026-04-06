import { tool } from "@opencode-ai/plugin";

export const manageServiceRequiredSecrets = tool({
  description:
    "Manage required secrets for the current OpenPieces service. These are secrets that MUST be set before the service can be started. Supports list, add, remove actions. Use workspaceId and serviceId from OPENPIECES_CONTEXT. list: serviceId+workspaceId. add: secretKey (the key name like STRIPE_API_KEY). remove: id (the required secret ID from list). Pass all fields as a single JSON string in the 'input' argument.",
  args: {
    input: tool.schema
      .string()
      .describe(
        'JSON object: action (required, one of: list/add/remove), workspaceId (required), serviceId (required), secretKey (for add), id (for remove)'
      ),
  },
  async execute(args) {
    const baseUrl =
      process.env.OPENPIECES_INTERNAL_URL ||
      process.env.OPENPIECES_APP_URL ||
      "http://app:3141";

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

    const validActions = ["list", "add", "remove"];
    if (!validActions.includes(parsed.action)) {
      return `Error: Invalid action "${parsed.action}". Valid: ${validActions.join(", ")}`;
    }

    const body = {
      action: parsed.action,
      workspaceId: parsed.workspaceId,
      serviceId: parsed.serviceId,
    };

    if (parsed.secretKey) body.secretKey = parsed.secretKey;
    if (parsed.id) body.id = parsed.id;

    try {
      const response = await fetch(`${baseUrl}/api/internal/service-required-secrets`, {
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