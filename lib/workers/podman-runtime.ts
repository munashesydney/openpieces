import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PieceManifest {
  /** Runtime to use — "deno" (default) or "podman" */
  runtime: "deno" | "podman";
  /** Whether the worker should build the image before running */
  build?: boolean;
  /** Path to the Dockerfile relative to the piece directory (default: "Dockerfile") */
  dockerfile?: string;
  /** Image name: used as build tag (when build:true) or as the image to pull & run (when build:false) */
  image?: string;
  /** Container entrypoint command + args. The PORT env var is injected automatically. */
  entrypoint?: string[];
  /** Port the container process listens on internally (default: 8000) */
  exposePort?: number;
  /** Memory limit for the container (e.g. "256m", "512m", "1g"). Passed as --memory to podman run. */
  memory?: string;
  /** CPU limit for the container (e.g. "0.5", "1.0", "2.0"). Passed as --cpus to podman run. */
  cpus?: string;
}

// ── Manifest reading ─────────────────────────────────────────────────────────

/**
 * Reads and parses piece.json from a piece directory.
 * Returns null if the file doesn't exist or is invalid — caller falls back to Deno.
 */
export function readPieceManifest(directory: string): PieceManifest | null {
  const manifestPath = path.join("./pieces", directory, "piece.json");
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as PieceManifest;

    if (!manifest.runtime || !["deno", "podman"].includes(manifest.runtime)) {
      console.warn(
        `[podman-runtime] Invalid or missing "runtime" in ${manifestPath}, falling back to deno`,
      );
      return null;
    }

    return manifest;
  } catch (err) {
    console.warn(
      `[podman-runtime] Failed to parse ${manifestPath}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Availability check ───────────────────────────────────────────────────────

let _podmanAvailable: boolean | null = null;

/**
 * Checks whether podman is installed and usable.
 * Result is cached after the first call.
 */
export function isPodmanAvailable(): boolean {
  if (_podmanAvailable !== null) return _podmanAvailable;
  try {
    execSync("podman --version", { stdio: "ignore" });
    _podmanAvailable = true;
  } catch {
    _podmanAvailable = false;
  }
  return _podmanAvailable;
}

// ── Image build ──────────────────────────────────────────────────────────────

export interface BuildImageOptions {
  /** Absolute or relative path to the Dockerfile */
  dockerfilePath: string;
  /** Build context directory (usually the piece directory) */
  contextDir: string;
  /** Tag applied to the built image */
  imageTag: string;
  /** Optional callback for streaming build output in real time */
  onLog?: (line: string) => void;
}

/**
 * Builds a container image via `podman build`.
 * Resolves when the build completes successfully, rejects on failure.
 */
export function buildImage(opts: BuildImageOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "podman",
      [
        "build",
        "-t",
        opts.imageTag,
        "-f",
        opts.dockerfilePath,
        opts.contextDir,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stderr = "";

    proc.stdout?.on("data", (d: Buffer) => {
      const text = d.toString().trim();
      if (text) {
        stderr += text + "\n";
        opts.onLog?.(text);
      }
    });

    proc.stderr?.on("data", (d: Buffer) => {
      const text = d.toString().trim();
      if (text) {
        stderr += text + "\n";
        opts.onLog?.(text);
      }
    });

    proc.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `podman build failed (exit ${code}): ${stderr.slice(-1000)}`,
          ),
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`podman build spawn error: ${err.message}`));
    });
  });
}

// ── Container spawn ──────────────────────────────────────────────────────────

export interface SpawnContainerOptions {
  /** Image to run */
  image: string;
  /** Entrypoint command + args (e.g. ["python", "main.py"]) */
  entrypoint: string[];
  /** Host port to map (dynamically assigned by findFreePort) */
  hostPort: number;
  /** Port the container listens on internally */
  containerPort: number;
  /** Unique container name (e.g. "piece-<serviceId>") */
  containerName: string;
  /** Working directory — piece directory path */
  directory: string;
  /** Environment variables injected into the container */
  env: Record<string, string>;
  /** Memory limit passed as --memory to podman run (e.g. "512m", "1g") */
  memory?: string;
  /** CPU limit passed as --cpus to podman run (e.g. "1.0", "2.0") */
  cpus?: string;
}

/**
 * Spawns a podman container and returns its container ID.
 * The container runs in the foreground (stdio piped) so logs are captured
 * through the child process streams, matching the existing Deno pattern.
 */
export function spawnContainer(
  opts: SpawnContainerOptions,
): Promise<import("child_process").ChildProcess> {
  return new Promise((resolve, reject) => {
    // Build the argument list
    const args: string[] = [
      "run",
      "--rm",
      "--name",
      opts.containerName,
      "-p",
      `${opts.hostPort}:${opts.containerPort}`,
    ];

    // Inject all env vars
    for (const [key, value] of Object.entries(opts.env)) {
      if (value !== undefined && value !== null) {
        args.push("-e", `${key}=${value}`);
      }
    }

    // Resource limits
    if (opts.memory) args.push("--memory", opts.memory);
    if (opts.cpus) args.push("--cpus", opts.cpus);

    // Image and entrypoint
    args.push(opts.image);
    args.push(...opts.entrypoint);

    const proc = spawn("podman", args, {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: `./pieces/${opts.directory}`,
    });

    // Resolve immediately with the process handle — callers attach
    // stdout/stderr/error/exit listeners themselves (matching Deno pattern).
    // We wait a tick to catch immediate spawn errors.
    let settled = false;

    proc.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(new Error(`podman run spawn error: ${err.message}`));
      }
    });

    proc.on("spawn", () => {
      if (!settled) {
        settled = true;
        resolve(proc);
      }
    });

    // Fallback: if neither "error" nor "spawn" fires quickly, resolve anyway.
    // The caller's exit handler will catch runtime failures.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(proc);
      }
    }, 500);
  });
}

// ── Container stop ───────────────────────────────────────────────────────────

/**
 * Stops and removes a podman container by name or ID.
 * Sends SIGTERM first, then force-removes after a 5-second grace period.
 */
export async function stopContainer(containerNameOrId: string): Promise<void> {
  // Graceful stop
  try {
    execSync(`podman stop --time 5 ${containerNameOrId}`, {
      stdio: "ignore",
      timeout: 10_000,
    });
  } catch {
    // Container may already be stopped or non-existent
  }

  // Force remove (belt and suspenders — in case --rm didn't activate)
  try {
    execSync(`podman rm -f ${containerNameOrId}`, {
      stdio: "ignore",
      timeout: 5_000,
    });
  } catch {
    // Already removed
  }
}

// ── Bulk cleanup ─────────────────────────────────────────────────────────────

/**
 * Returns the IDs of all running piece containers (name prefix "piece-").
 * Used during worker shutdown to clean up any remaining containers.
 */
export function collectPieceContainerIds(): string[] {
  try {
    const output = execSync(
      `podman ps -a --filter "name=piece-" --format "{{.ID}}"`,
      { encoding: "utf8", timeout: 5_000 },
    );
    return output
      .trim()
      .split("\n")
      .filter((id) => id.length > 0);
  } catch {
    return [];
  }
}

/**
 * Stops all piece containers. Called on worker shutdown.
 */
export async function stopAllPieceContainers(): Promise<void> {
  const ids = collectPieceContainerIds();
  if (ids.length === 0) return;

  console.log(`[podman-runtime] Stopping ${ids.length} piece container(s)...`);

  for (const id of ids) {
    await stopContainer(id);
  }
}

// ── Container name helpers ───────────────────────────────────────────────────

export function containerNameForService(serviceId: string): string {
  return `piece-${serviceId}`;
}

export function imageTagForService(serviceId: string): string {
  return `piece-${serviceId}:latest`;
}
