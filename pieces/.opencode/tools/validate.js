import { tool } from "@opencode-ai/plugin";

export const validate = tool({
  description:
    "Run a validation command inside an ephemeral container to check for errors before deploying. The piece directory is mounted at /work. The container is destroyed after the command exits (or after your timeout, whichever comes first). Use this to catch syntax errors, missing imports, type errors, and build failures BEFORE triggering a full deploy. Common commands: 'npm install && npm run lint && tsc --noEmit' (Next.js), 'python -m py_compile *.py' (Python), 'go vet ./... && go build ./...' (Go). Set a higher timeout (e.g. 300) for commands that pull images or install large dependencies.",
  args: {
    input: tool.schema
      .string()
      .describe(
        'JSON object with fields: image (required, container image, e.g. "node:20-slim"), command (required, shell command to run inside the container, e.g. "npm install && npm run lint"), directory (required, piece directory relative to pieces/ root), timeout (optional seconds, default 120, max 600)',
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

    if (!parsed.image || !parsed.command || !parsed.directory) {
      return 'Error: Missing required fields. Provide a JSON object with: image (e.g. "node:20-slim"), command (e.g. "npm install && npm run lint"), and directory (the piece directory).';
    }

    try {
      const response = await fetch(`${baseUrl}/api/internal/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          image: parsed.image,
          command: parsed.command,
          directory: parsed.directory,
          timeout: parsed.timeout,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return `Error: Invalid response from validation endpoint: ${text.slice(0, 500)}`;
      }

      if (!response.ok) {
        return `Error (${response.status}): ${data.error || "Unknown error"}`;
      }

      const { stdout, stderr, exitCode, timedOut } = data;

      if (timedOut) {
        return `❌ Validation timed out after 120 seconds. The command may have hung (e.g. a dev server or infinite loop). Check your command and try a finite one.\n\nLast stderr:\n${stderr || "(none)"}\n\nLast stdout:\n${stdout || "(none)"}`;
      }

      if (exitCode !== 0) {
        return `❌ Validation failed (exit code ${exitCode}).\n\nstderr:\n${stderr || "(none)"}\n\nstdout:\n${stdout || "(none)"}`;
      }

      return `✅ Validation passed.\n\nstdout:\n${stdout || "(none)"}\n\nstderr:\n${stderr || "(none)"}`;
    } catch (err) {
      return `Error: ${err.message || "Failed to reach the OpenPieces validation API"}`;
    }
  },
});
