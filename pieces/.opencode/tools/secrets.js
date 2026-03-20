import { tool } from "@opencode-ai/plugin";

export const manageSecrets = tool({
  description:
    "Manage encrypted secrets for this workspace and user. Supports list, get, create, update, delete actions. Required fields vary by action: list needs workspaceId+userId, get/delete needs secretId, create needs key+value, update needs secretId+key or value. Pass all fields as a single JSON string in the 'input' argument.",
  args: {
    input: tool.schema
      .string()
      .describe(
        'JSON object with fields: action (required, one of: list/get/create/update/delete), workspaceId (required), userId (required), secretId (for get/update/delete), key (for create/update), value (for create/update)'
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
      userId: parsed.userId,
    };

    if (parsed.secretId) body.secretId = parsed.secretId;
    if (parsed.key) body.key = parsed.key;
    if (parsed.value !== undefined) body.value = parsed.value;

    try {
      const response = await fetch(`${baseUrl}/api/internal/secrets`, {
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
