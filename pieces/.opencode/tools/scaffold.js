import { tool } from "@opencode-ai/plugin";

export const scaffold = tool({
  description:
    "Scaffold a new piece from a pre-built template. Use this to get a working project skeleton instantly. Call with action 'list' to see available scaffolds, then 'copy' to copy one into your piece directory. The directory must be the relative path from pieces/ root (e.g. 'userId/workspaceId/slug' — NOT absolute like '/pieces/...').",
  args: {
    input: tool.schema
      .string()
      .describe(
        'JSON object with fields: action (required, one of: "list", "copy"), scaffold (for "copy", the scaffold name e.g. "nextjs" or "reactjs"), directory (for "copy", the piece directory relative to pieces/ root)',
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

    if (!parsed.action || !["list", "copy"].includes(parsed.action)) {
      return 'Error: Invalid or missing action. Use "list" or "copy".';
    }

    if (parsed.action === "copy" && (!parsed.scaffold || !parsed.directory)) {
      return 'Error: "copy" action requires "scaffold" and "directory" fields.';
    }

    try {
      const response = await fetch(`${baseUrl}/api/internal/scaffold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          action: parsed.action,
          scaffold: parsed.scaffold,
          directory: parsed.directory,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return `Error: Invalid response from scaffold endpoint: ${text.slice(0, 500)}`;
      }

      if (!response.ok) {
        return `Error (${response.status}): ${data.error || "Unknown error"}`;
      }

      if (parsed.action === "list") {
        const names = data.scaffolds || [];
        if (names.length === 0) {
          return "No scaffolds available.";
        }
        return `Available scaffolds:\n${names.map((n) => `  - ${n}`).join("\n")}`;
      }

      // copy response
      return `✅ ${data.message}\n\nFiles copied:\n${(data.copied || []).map((f) => `  pieces/${f}`).join("\n")}${data.errors ? `\n\n⚠️ Errors:\n${data.errors.map((e) => `  - ${e}`).join("\n")}` : ""}`;
    } catch (err) {
      return `Error: ${err.message || "Failed to reach the OpenPieces scaffold API"}`;
    }
  },
});
