import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// ── Types ────────────────────────────────────────────────────────────────────

interface ValidateRequestBody {
  /** Piece directory relative to pieces/ root (e.g. "userId/workspaceId/slug") */
  directory: string;
  /** Container image to run the command in */
  image: string;
  /** Shell command to execute inside the container (timeout-wrapped automatically) */
  command: string;
  /** Timeout in seconds (default 120, max 600) */
  timeout?: number;
}

interface ValidateResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const INTERNAL_HEADER_NAME = "x-internal-secret";

function isAuthorized(request: NextRequest): boolean {
  const headerValue = request.headers.get(INTERNAL_HEADER_NAME) ?? "";
  const expected = process.env.INTERNAL_API_KEY ?? "";
  return Boolean(expected) && headerValue === expected;
}

// ── Sanitise ─────────────────────────────────────────────────────────────────

/**
 * Rejects directory paths that attempt traversal outside the pieces root.
 */
function isSafeDirectory(dir: string): boolean {
  // Reject absolute paths, null bytes, and "../" sequences
  if (path.isAbsolute(dir)) return false;
  if (dir.includes("\0")) return false;
  const normalized = path.normalize(dir);
  return !normalized.startsWith("..") && normalized !== "..";
}

// ── Handler ──────────────────────────────────────────────────────────────────

const VALIDATE_TIMEOUT_SECONDS = 120;

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ValidateRequestBody;
  try {
    body = (await request.json()) as ValidateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { directory, image, command, timeout: rawTimeout } = body;

  if (!directory || !image || !command) {
    return NextResponse.json(
      { error: "Missing required fields: directory, image, command" },
      { status: 400 },
    );
  }

  const timeoutSeconds = Math.min(
    Math.max(rawTimeout ?? VALIDATE_TIMEOUT_SECONDS, 10),
    600,
  );

  if (!isSafeDirectory(directory)) {
    return NextResponse.json(
      { error: "Invalid directory path" },
      { status: 400 },
    );
  }

  const piecesRoot = path.resolve("./pieces");
  const workDir = path.resolve(piecesRoot, directory);

  // Safety: ensure the resolved workDir is still inside pieces/
  if (!workDir.startsWith(piecesRoot)) {
    return NextResponse.json(
      { error: "Directory escapes pieces root" },
      { status: 400 },
    );
  }

  // Wrap the command with a hard timeout so long-running processes
  // (e.g. accidental `npm run dev`) are killed automatically.
  const wrappedCommand = `timeout ${timeoutSeconds} ${command}`;

  console.log(
    `[validate] Running validation: podman run --rm -v ${workDir}:/work -w /work ${image} sh -c "${wrappedCommand}"`,
  );

  try {
    const result = await runPodmanCommand(
      image,
      workDir,
      wrappedCommand,
      timeoutSeconds,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[validate] Podman spawn error:", message);
    return NextResponse.json(
      { error: `Failed to run validation: ${message}` },
      { status: 500 },
    );
  }
}

// ── Podman runner ────────────────────────────────────────────────────────────

function runPodmanCommand(
  image: string,
  workDir: string,
  command: string,
  timeoutSeconds: number,
): Promise<ValidateResponse> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "podman",
      [
        "run",
        "--rm",
        "-v",
        `${workDir}:/work`,
        "-w",
        "/work",
        image,
        "sh",
        "-c",
        command,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    proc.stdout?.on("data", (d: Buffer) => {
      // Cap output to avoid memory bloat from runaway processes
      if (stdout.length < 100_000) stdout += d.toString();
    });

    proc.stderr?.on("data", (d: Buffer) => {
      if (stderr.length < 100_000) stderr += d.toString();
    });

    // Node-side safety timeout: if podman itself hangs (e.g. image pull stalls),
    // kill the process and return a timeout response.
    const safetyTimer = setTimeout(
      () => {
        timedOut = true;
        proc.kill("SIGKILL");
      },
      (timeoutSeconds + 30) * 1000,
    ); // 30s grace over the container timeout

    proc.on("error", (err) => {
      clearTimeout(safetyTimer);
      reject(err);
    });

    proc.on("exit", (code, signal) => {
      clearTimeout(safetyTimer);

      if (signal === "SIGKILL" || signal === "SIGTERM") {
        timedOut = true;
      }

      // exit code 124 is the Linux `timeout` command's signal for "timed out"
      const exitCode = code === 124 ? 124 : (code ?? 1);

      resolve({
        stdout: stdout.slice(-50_000), // return last 50k chars
        stderr: stderr.slice(-50_000),
        exitCode,
        timedOut: timedOut || code === 124,
      });
    });
  });
}
