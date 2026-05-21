import { spawn } from "child_process";
import fs from "fs";
import net from "net";
import { and, eq, sql } from "drizzle-orm";
import {
  readPieceManifest,
  isPodmanAvailable,
  buildImage,
  spawnContainer,
  stopContainer,
  stopAllPieceContainers,
  containerNameForService,
  imageTagForService,
} from "@/lib/workers/podman-runtime";
import {
  SERVICE_SPAWN_QUEUE,
  SERVICE_STOP_QUEUE,
  type ServiceSpawnJob,
  type ServiceStopJob,
  enqueueServiceSpawn,
  getPgBoss,
} from "@/lib/queues/pg-boss";
import {
  getServiceById,
  updateService,
  deleteService,
} from "@/lib/services/service.service";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";
import { getSecrets } from "@/lib/services/secret.service";
import { getRequiredSecrets } from "@/lib/services/service-required-secrets.service";
import {
  appendServiceLog,
  resetServiceLog,
  readServiceLogTail,
} from "@/lib/services/service-log-stream";
import { db } from "@/lib/db";
import { services, type Service } from "@/lib/db/schema";

const PORT_START = 8001;
const PORT_END = 9000;
const MAX_DEPLOYMENT_TIME_MS = 120 * 1000; // 120 seconds
const MAX_SPAWN_FAIL_RETRIES = 3;
const QA_SPAWN_MAX_RETRIES = 1;

// In-memory set to prevent double-booking ports across concurrent spawn attempts.
// Lock is held by the pg advisory lock inside findFreePort, but we also track
// reserved ports here so that when the advisory lock is released between two
// calls, the second caller won't pick a port already reserved by the first.
const _reservedPorts = new Set<number>();
// Maps serviceId -> port so the catch block in startServiceWorker can also
// clean up the in-memory reservation on unexpected failures.
const _reservedServicePorts = new Map<string, number>();
// Tracks services currently being spawned (in-memory) to prevent the same
// service from being spawned concurrently by multiple queue consumers.
const _spawningServices = new Set<string>();

// Tracks PIDs of successfully spawned Deno child processes so they can be
// explicitly killed during worker shutdown, preventing orphan accumulation
// across container restarts (Docker restart: always preserves PID namespace).
const _childPids = new Set<number>();

// Tracks podman container names (piece-<serviceId>) for services running under
// the podman runtime. Used for cleanup on stop / worker shutdown.
const _containerIds = new Map<string, string>();

async function isPortBoundByOS(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(): Promise<number> {
  // Use a PostgreSQL advisory lock to serialize concurrent port allocations.
  // The in-memory _reservedPorts set catches races between lock releases and
  // actual process startup, preventing double-booking across concurrent spawns.
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(123456789)`);

    const usedPorts = await tx
      .select({ port: services.port })
      .from(services)
      .where(eq(services.port, services.port));

    const dbPorts = new Set(usedPorts.map((r) => r.port).filter(Boolean));

    for (let port = PORT_START; port <= PORT_END; port++) {
      if (dbPorts.has(port)) continue;
      if (_reservedPorts.has(port)) continue;
      const bound = await isPortBoundByOS(port);
      if (!bound) {
        _reservedPorts.add(port);
        return port;
      }
    }

    throw new Error("No free port found in range 8001–9000");
  });
}

async function pollHealth(
  port: number,
  timeoutMs = 45000,
  intervalMs = 500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function executeServiceSpawnJob(job: ServiceSpawnJob) {
  const { serviceId, workspaceId } = job;

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  if (!service.directory?.trim()) {
    throw new Error(`Service ${serviceId} has no directory set`);
  }

  // Prevent concurrent spawns of the same service via in-memory lock.
  // (The DB "deploying" status alone is not reliable because enqueueServiceSpawn
  // sets it before the job is picked up, and with localConcurrency > 1 multiple
  // jobs for the same service can run in parallel.)
  if (_spawningServices.has(serviceId)) {
    throw new Error(
      `Service ${serviceId} is already being spawned by another worker`,
    );
  }
  _spawningServices.add(serviceId);

  // ── Read piece manifest (if it exists) to determine runtime ────────────
  const manifest = readPieceManifest(service.directory.trim());
  const runtime = manifest?.runtime ?? "deno";

  // If the service was stuck in "deploying" status (e.g. orphaned after a
  // worker crash), reset it so the spawn can proceed.
  if (service.status === "deploying") {
    const deploymentDurationMs = Date.now() - service.updatedAt.getTime();
    if (deploymentDurationMs > MAX_DEPLOYMENT_TIME_MS) {
      console.log(
        `[service-worker] Service ${serviceId} was stuck deploying for ${Math.round(deploymentDurationMs / 1000)}s, resetting to stopped`,
      );
      await updateService(
        serviceId,
        workspaceId,
        { status: "stopped" },
        "system",
      );
      await appendServiceLog(
        service.directory.trim(),
        "info",
        `Deployment timeout after ${Math.round(deploymentDurationMs / 1000)}s, reset to stopped`,
      );
    }
  }

  // ── Validate entrypoint exists ───────────────────────────────────────
  // For Deno: index.ts must exist.
  // For Podman: Dockerfile must exist (checked later during build).
  if (runtime === "deno") {
    const indexPath = `./pieces/${service.directory.trim()}/index.ts`;
    if (!fs.existsSync(indexPath)) {
      const msg = `Service ${serviceId} has no index.ts at ${indexPath} - skipping spawn`;
      await appendServiceLog(service.directory.trim(), "error", msg);

      if (service.pid) {
        try {
          process.kill(service.pid, "SIGKILL");
        } catch {
          // Ignore errors if process doesn't exist
        }
      }
      throw new Error(msg);
    }
  } else {
    // Podman: validate the Dockerfile exists (either from manifest or default)
    const dockerfileRel = manifest?.dockerfile ?? "Dockerfile";
    const dockerfilePath = `./pieces/${service.directory.trim()}/${dockerfileRel}`;
    if (!fs.existsSync(dockerfilePath)) {
      const msg = `Service ${serviceId} has no Dockerfile at ${dockerfilePath} - skipping spawn`;
      await appendServiceLog(service.directory.trim(), "error", msg);
      throw new Error(msg);
    }
    if (!manifest?.image) {
      const msg = `Service ${serviceId} piece.json is missing required "image" field`;
      await appendServiceLog(service.directory.trim(), "error", msg);
      throw new Error(msg);
    }
    if (!manifest?.entrypoint || manifest.entrypoint.length === 0) {
      const msg = `Service ${serviceId} piece.json is missing required "entrypoint" field`;
      await appendServiceLog(service.directory.trim(), "error", msg);
      throw new Error(msg);
    }
  }

  // ── Kill any existing process / container before restart ─────────────
  if (runtime === "podman") {
    // Stop any existing container with the same name
    const containerName = containerNameForService(serviceId);
    try {
      await stopContainer(containerName);
      console.log(
        `[service-worker] Service ${serviceId} stopped existing podman container for force restart`,
      );
      await appendServiceLog(
        service.directory.trim(),
        "info",
        `Force restarting service (stopped existing container)`,
      );
    } catch {
      // Container may not exist — fine
    }
  } else if (service.pid) {
    // Deno: check if PID is alive and kill it
    try {
      process.kill(service.pid, 0); // Signal 0 = check if process exists
      // Process is alive, kill it first
      console.log(
        `[service-worker] Service ${serviceId} has alive PID ${service.pid}, killing for force restart`,
      );
      await appendServiceLog(
        service.directory.trim(),
        "info",
        `Force restarting service (PID: ${service.pid})`,
      );
      process.kill(service.pid, "SIGTERM");
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const checkExit = setInterval(() => {
          try {
            process.kill(service.pid!, 0);
          } catch {
            clearInterval(checkExit);
            resolve();
          }
        }, 500);
        setTimeout(() => {
          clearInterval(checkExit);
          try {
            process.kill(service.pid!, "SIGKILL");
          } catch {
            // Process already gone
          }
          resolve();
        }, 5000);
      });
    } catch {
      // PID is dead/stale, just continue
      console.log(
        `[service-worker] Service ${serviceId} has stale PID ${service.pid}, will reset and restart`,
      );
      await updateService(
        serviceId,
        workspaceId,
        { port: null, pid: null, status: "stopped" },
        "system",
      );
    }
  }

  // Check if all required secrets are set
  const requiredSecrets = await getRequiredSecrets(serviceId);
  if (requiredSecrets.length > 0) {
    const workspaceOwnerId = (await getWorkspaceOwnerId(workspaceId)) ?? "";
    const { data: secrets } = await getSecrets(
      workspaceId,
      workspaceOwnerId,
      1,
      500,
    );
    const secretKeys = new Set(secrets.map((s) => s.key));

    const missingSecrets = requiredSecrets
      .filter((req) => !secretKeys.has(req.secretKey))
      .map((req) => req.secretKey);

    const emptyValueSecrets = requiredSecrets
      .filter((req) => {
        const secret = secrets.find((s) => s.key === req.secretKey);
        return !secret?.value?.trim();
      })
      .map((req) => req.secretKey);

    const allProblemSecrets = [...missingSecrets, ...emptyValueSecrets];
    if (allProblemSecrets.length > 0) {
      throw new Error(
        `Missing or empty required secrets: ${allProblemSecrets.join(", ")}`,
      );
    }
  }

  // Derive the workspace owner user ID so we can pass it into the service process.
  const workspaceOwnerId = (await getWorkspaceOwnerId(workspaceId)) ?? "";

  // Load all personal secrets for this workspace/user and inject as environment variables.
  let secretEnv: Record<string, string> = {};
  try {
    const { data: secrets } = await getSecrets(
      workspaceId,
      workspaceOwnerId,
      1,
      500,
    );
    secretEnv = secrets.reduce<Record<string, string>>((acc, secret) => {
      if (secret.key && typeof secret.value === "string") {
        acc[secret.key] = secret.value;
      }
      return acc;
    }, {});
  } catch (err) {
    console.error(
      `[service-worker] Failed to load secrets for workspace ${workspaceId} and user ${workspaceOwnerId}:`,
      err,
    );
  }

  // ── Cross-process guard ─────────────────────────────────────────
  // Re-read the service from DB to check if another worker already
  // spawned it while we were doing validation above.  This catches
  // races that the in-memory _spawningServices set cannot see.
  const refreshed = await getServiceById(serviceId, workspaceId);
  if (refreshed && refreshed.status === "running" && refreshed.port) {
    const portInUse = await isPortBoundByOS(refreshed.port);
    if (portInUse) {
      _spawningServices.delete(serviceId);
      throw new Error(
        `Service ${serviceId} is already running on port ${refreshed.port} (cross-process guard)`,
      );
    }
  }

  const port = await findFreePort();
  _reservedServicePorts.set(serviceId, port);
  const directory = service.directory.trim();

  // ── Build the common environment object ───────────────────────────────
  const baseEnv = {
    ...process.env,
    ...secretEnv,
  };
  const commonEnv = {
    ...baseEnv,
    LD_LIBRARY_PATH: "/opt/deno-glibc",
    OPENPIECES_USER_ID: workspaceOwnerId,
    OPENPIECES_WORKSPACE_ID: service.workspaceId,
    OPENPIECES_SERVICE_ID: serviceId,
    OPENPIECES_WORKFLOW_ID: service.workflowId ?? "",
    OPENPIECES_INTERNAL_URL:
      process.env.OPENPIECES_INTERNAL_URL ??
      `http://app:${process.env.APP_PORT ?? 3141}`,
    OPENPIECES_SERVICE_PUBLIC_URL: (() => {
      const domain = (process.env.SERVICE_DOMAIN ?? "").trim();
      if (domain) {
        const protocol = domain === "localhost" ? "http" : "https";
        const port =
          domain === "localhost" ? `:${process.env.APP_PORT ?? "3141"}` : "";
        return `${protocol}://${serviceId}.${domain}${port}`;
      }
      return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3141"}/api/s/${serviceId}`;
    })(),
  };

  let proc: import("child_process").ChildProcess;

  if (runtime === "podman") {
    // ── Podman path ────────────────────────────────────────
    if (!isPodmanAvailable()) {
      throw new Error(
        `Service ${serviceId} requires podman runtime but podman is not available on this worker`,
      );
    }

    const containerName = containerNameForService(serviceId);
    const entrypoint = manifest!.entrypoint!;
    const containerPort = manifest!.exposePort ?? 8000;
    const dockerfileRel = manifest!.dockerfile ?? "Dockerfile";
    const dockerfilePath = `./pieces/${directory}/${dockerfileRel}`;

    // Determine the image to run: built tag when build:true, otherwise the manifest image
    let image = manifest!.image!;

    // Build image if requested
    if (manifest!.build) {
      image = imageTagForService(serviceId);
      await appendServiceLog(
        directory,
        "info",
        `Building podman image "${image}" from ${dockerfileRel}...`,
      );
      await buildImage({
        dockerfilePath,
        contextDir: `./pieces/${directory}`,
        imageTag: image,
      });
      await appendServiceLog(
        directory,
        "info",
        `Podman image "${image}" built successfully`,
      );
    }

    await resetServiceLog(directory);
    await appendServiceLog(
      directory,
      "info",
      `Spawning podman container "${containerName}" on port ${port} (image: ${image})`,
    );

    // Inject PORT so the container knows what port to listen on (containerPort, not hostPort)
    const podmanEnv = { ...commonEnv, PORT: String(containerPort) };

    proc = await spawnContainer({
      image,
      entrypoint,
      hostPort: port,
      containerPort,
      containerName,
      directory,
      env: podmanEnv,
      memory: manifest!.memory,
      cpus: manifest!.cpus,
    });

    // Track container name for cleanup
    _containerIds.set(serviceId, containerName);
  } else {
    // ── Deno path (existing behaviour) ──────────────────────────
    const entryPoint = "index.ts";

    await resetServiceLog(directory);
    await appendServiceLog(
      directory,
      "info",
      `Spawning service "${service.title}" on port ${port}: ${entryPoint}`,
    );

    proc = spawn(
      "deno",
      [
        "run",
        "--allow-net",
        "--allow-read",
        "--allow-env",
        "--allow-write",
        "--allow-run",
        "--allow-sys",
        "--allow-ffi",
        entryPoint,
        String(port),
      ],
      {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        cwd: `./pieces/${directory}`,
        env: commonEnv,
      },
    );
  }

  // Track PID so killChildProcesses() can clean it up on worker shutdown.
  if (proc.pid !== undefined) {
    _childPids.add(proc.pid);
  }

  proc.stdout?.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      void appendServiceLog(directory, "info", message);
    }
  });
  proc.stderr?.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      void appendServiceLog(directory, "error", message);
    }
  });
  proc.on("error", (err) => {
    if (proc.pid !== undefined) _childPids.delete(proc.pid);
    if (runtime === "podman") _containerIds.delete(serviceId);
    console.error(
      `[service-worker][${service.title}] spawn error:`,
      err.message,
    );
    void appendServiceLog(directory, "error", `Spawn error: ${err.message}`);
  });
  proc.on("exit", (code, signal) => {
    if (proc.pid !== undefined) _childPids.delete(proc.pid);
    if (runtime === "podman") _containerIds.delete(serviceId);
    if (code !== null) {
      console.error(
        `[service-worker][${service.title}] exited with code ${code}`,
      );
      void appendServiceLog(
        directory,
        "error",
        `Process exited with code ${code}`,
      );
    } else if (signal) {
      console.error(
        `[service-worker][${service.title}] killed by signal ${signal}`,
      );
      void appendServiceLog(
        directory,
        "error",
        `Process killed by signal ${signal}`,
      );
    }
  });

  proc.unref();

  const healthy = await pollHealth(port);

  if (healthy) {
    // Release port from in-memory reservation
    _reservedPorts.delete(port);
    _reservedServicePorts.delete(serviceId);
    _spawningServices.delete(serviceId);

    try {
      await updateService(
        serviceId,
        workspaceId,
        {
          port,
          pid: runtime === "podman" ? null : proc.pid,
          status: "running",
          spawnFailCount: 0,
        },
        "system",
      );
    } catch (err) {
      // DB update failed after a successful spawn — kill the orphaned
      // child process / container so it doesn't become a zombie.
      if (runtime === "podman") {
        const containerName = containerNameForService(serviceId);
        stopContainer(containerName).catch(() => {});
        _containerIds.delete(serviceId);
      } else if (proc.pid) {
        try {
          process.kill(proc.pid, "SIGKILL");
        } catch {
          /* already dead */
        }
      }
      throw err;
    }
    await appendServiceLog(
      directory,
      "info",
      `Service is healthy on port ${port}`,
    );

    // Spawn the QA AI agent to check health asynchronously after 30 seconds
    setTimeout(async () => {
      try {
        const { serviceHasWorkingSession } =
          await import("@/lib/services/opencode-session.service");
        const hasWorking = await serviceHasWorkingSession(serviceId);
        if (hasWorking) {
          console.log(
            `[service-worker] Skipping QA agent for service ${serviceId} — an opencode session is already working on it`,
          );
          return;
        }

        // Atomically increment qa_spawn_count; skip if already at the cap.
        // This prevents infinite QA agent accumulation across crash loops.
        const [updated] = await db.execute(
          sql`UPDATE ${services} SET qa_spawn_count = qa_spawn_count + 1 WHERE id = ${serviceId} AND qa_spawn_count < ${QA_SPAWN_MAX_RETRIES} RETURNING id`,
        );
        if (!updated) {
          console.log(
            `[service-worker] Skipping QA agent for service ${serviceId} — qa_spawn_count already at cap (${QA_SPAWN_MAX_RETRIES})`,
          );
          return;
        }

        const { createAiChat, appendUserMessageAndMarkPending } =
          await import("@/lib/services/chat.service");
        const { enqueueChatExecution } = await import("@/lib/queues/pg-boss");

        // We use workspaceOwnerId because userId must be a valid UUID in the ai_chats table.
        const qaChat = await createAiChat(
          { workspaceId, userId: workspaceOwnerId },
          "qa",
        );
        await appendUserMessageAndMarkPending({
          chatId: qaChat.id,
          content: `Service "${service.title}" (ID: ${service.id}) has just started on port ${port}. Please check its logs using manage_services to ensure everything is running perfectly and there are no immediate crashes or infinite reboot loops.`,
        });
        await enqueueChatExecution({
          chatId: qaChat.id,
          workspaceId,
          userId: workspaceOwnerId,
        });
        console.log(
          `[service-worker] Spawned QA agent for service ${serviceId} after 30s delay`,
        );
      } catch (err) {
        console.error("[service-worker] Failed to spawn QA agent:", err);
      }
    }, 30000);
  } else {
    await appendServiceLog(
      directory,
      "error",
      `Service did not become healthy on port ${port}`,
    );
    // Kill the unresponsive child process / container so it doesn't linger
    if (runtime === "podman") {
      const containerName = containerNameForService(serviceId);
      stopContainer(containerName).catch(() => {});
      _containerIds.delete(serviceId);
    } else if (proc.pid) {
      try {
        process.kill(proc.pid, "SIGKILL");
      } catch {
        /* already dead */
      }
    }
    // Release port from in-memory reservation
    _reservedPorts.delete(port);
    _reservedServicePorts.delete(serviceId);
    _spawningServices.delete(serviceId);
    throw new Error(`Service did not become healthy on port ${port}`);
  }
}

async function sendSpawnFailureMessage(
  service: Service,
  workspaceId: string,
  sessionId: string | undefined,
  error: string,
) {
  try {
    const { content: logTail } = await readServiceLogTail(service.directory!);
    // Extract last 10 lines for a concise error message
    const lastLines = logTail
      ? logTail
          .split("\n")
          .filter((l) => l.trim())
          .slice(-10)
          .join("\n")
      : "";

    const { sendMessage } = await import("@/lib/services/opencode.service");

    const errorText = lastLines
      ? `Service "${service.title}" failed to start. Last output:\n\`\`\`\n${lastLines}\n\`\`\`\n\nFull logs available at: pieces/${service.directory}/logs/`
      : `Service "${service.title}" failed to start: ${error}\n\nFull logs available at: pieces/${service.directory}/logs/`;

    // Prefer replying in the originating session; fall back to a new session if none was provided
    if (sessionId) {
      const { serviceHasWorkingSession } =
        await import("@/lib/services/opencode-session.service");
      const hasWorking = await serviceHasWorkingSession(service.id, sessionId);
      if (hasWorking) {
        const errMsg = `Cannot send spawn failure message: Another opencode session linked to this service is running - opencode session id: ${sessionId}`;
        console.error(`[service-worker] ${errMsg}`);
        throw new Error(errMsg);
      }
      await sendMessage(sessionId, errorText);
      console.log(
        `[service-worker] Sent spawn failure message to originating session ${sessionId}`,
      );
    } else {
      const { createSession, sendMessageWithContext } =
        await import("@/lib/services/opencode.service");
      const { setService } =
        await import("@/lib/services/opencode-session.service");
      const { getWorkspaceOwnerId } =
        await import("@/lib/services/workspace.service");

      const newSession = await createSession();
      const newSessionId =
        (newSession as any).session_id ?? (newSession as any).id;
      await setService(newSessionId, service.id);

      const workspaceOwnerId = (await getWorkspaceOwnerId(workspaceId)) ?? "";
      await sendMessageWithContext(newSessionId, errorText, workspaceOwnerId);
      console.log(
        `[service-worker] Sent spawn failure message to new opencode session ${newSessionId}`,
      );
    }
  } catch (err) {
    console.error("[service-worker] sendSpawnFailureMessage error:", err);
  }
}

async function executeServiceStopJob(job: ServiceStopJob) {
  const { serviceId, workspaceId } = job;

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }

  const directory = service.directory?.trim() ?? "";

  // Check if this is a podman service via the manifest or in-memory tracking
  const manifest = readPieceManifest(directory);
  const containerName =
    _containerIds.get(serviceId) ?? containerNameForService(serviceId);
  const isPodman =
    manifest?.runtime === "podman" || _containerIds.has(serviceId);

  if (isPodman) {
    await appendServiceLog(
      directory,
      "info",
      `Stopping podman container "${containerName}"`,
    );
    await stopContainer(containerName);
    _containerIds.delete(serviceId);
    await updateService(serviceId, workspaceId, {
      port: null,
      pid: null,
      status: "stopped",
    });
    await appendServiceLog(directory, "info", "Service stopped successfully");
    return;
  }

  if (!service.pid) {
    await appendServiceLog(
      directory,
      "info",
      "Service is not running (no PID found)",
    );
    return;
  }

  await appendServiceLog(
    directory,
    "info",
    `Stopping service (PID: ${service.pid})`,
  );

  try {
    process.kill(service.pid, "SIGTERM");

    // Wait for process to exit gracefully
    await new Promise<void>((resolve) => {
      const checkExit = setInterval(() => {
        try {
          process.kill(service.pid!, 0);
          // Process still running
        } catch {
          clearInterval(checkExit);
          resolve();
        }
      }, 500);

      // Timeout after 5 seconds, force kill
      setTimeout(() => {
        clearInterval(checkExit);
        try {
          process.kill(service.pid!, "SIGKILL");
        } catch {
          // Process already gone
        }
        resolve();
      }, 5000);
    });

    await updateService(serviceId, workspaceId, {
      port: null,
      pid: null,
      status: "stopped",
    });
    await appendServiceLog(directory, "info", "Service stopped successfully");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await appendServiceLog(
      directory,
      "error",
      `Failed to stop service: ${errorMessage}`,
    );
    console.error(
      `[service-worker] Failed to stop service ${serviceId}:`,
      errorMessage,
    );
    // Still mark as stopped in DB even if kill failed
    await updateService(serviceId, workspaceId, {
      port: null,
      pid: null,
      status: "stopped",
    });
  }
}

async function recoverAndStartAllServices() {
  console.log("[service-worker] Recovering services...");

  // Enqueue ALL services regardless of status.
  // executeServiceSpawnJob handles:
  //   - killing stale/alive PIDs
  //   - validating directory, secrets, and index.ts
  //   - spawning the service
  const allServices = await db.select().from(services);

  for (const svc of allServices) {
    await enqueueServiceSpawn({
      serviceId: svc.id,
      workspaceId: svc.workspaceId,
    });
    console.log(`[service-worker] Enqueued service ${svc.id} (${svc.title})`);
  }

  console.log("[service-worker] Service recovery complete");
}

async function cleanupStuckDeployments() {
  console.log("[service-worker] Checking for stuck deployments...");

  try {
    // Find services stuck in "deploying" status for too long
    const stuckServices = await db
      .select()
      .from(services)
      .where(eq(services.status, "deploying"));

    let cleanedCount = 0;

    for (const service of stuckServices) {
      const deploymentDurationMs = Date.now() - service.updatedAt.getTime();

      if (deploymentDurationMs > MAX_DEPLOYMENT_TIME_MS) {
        console.log(
          `[service-worker] Cleaning up stuck deployment for service ${service.id} (${service.title}) - stuck for ${Math.round(deploymentDurationMs / 1000)}s`,
        );

        await updateService(
          service.id,
          service.workspaceId,
          {
            status: "stopped",
            port: null,
            pid: null,
          },
          "system",
        );

        if (service.directory?.trim()) {
          await appendServiceLog(
            service.directory.trim(),
            "info",
            `Deployment timeout after ${Math.round(deploymentDurationMs / 1000)}s, reset to stopped`,
          );
        }

        cleanedCount++;
      }
    }

    // Also find crashed services that have exhausted their retries
    // and reset them to stopped so they don't get re-enqueued on restart
    const exhaustedServices = await db
      .select()
      .from(services)
      .where(
        and(
          eq(services.status, "crashed"),
          sql`${services.spawnFailCount} >= ${MAX_SPAWN_FAIL_RETRIES}`,
        ),
      );

    for (const service of exhaustedServices) {
      console.log(
        `[service-worker] Cleaning up exhausted service ${service.id} (${service.title}) - spawnFailCount=${service.spawnFailCount} >= ${MAX_SPAWN_FAIL_RETRIES}, resetting to stopped`,
      );

      await updateService(
        service.id,
        service.workspaceId,
        { status: "stopped", port: null, pid: null },
        "system",
      );

      if (service.directory?.trim()) {
        await appendServiceLog(
          service.directory.trim(),
          "info",
          `Spawn fail count (${service.spawnFailCount}) exceeded max retries (${MAX_SPAWN_FAIL_RETRIES}), reset to stopped`,
        );
      }

      cleanedCount++;
    }

    if (cleanedCount > 0) {
      console.log(
        `[service-worker] Cleaned up ${cleanedCount} stuck deployments`,
      );
    }
  } catch (error) {
    console.error(
      "[service-worker] Error cleaning up stuck deployments:",
      error,
    );
  }
}

/**
 * Kills all tracked child Deno processes and podman containers.
 * Called during graceful shutdown so detached children don't survive
 * as orphans across container restarts.
 *
 * 1. Stops all podman piece containers.
 * 2. Sends SIGTERM to all tracked PIDs for graceful shutdown.
 * 3. Waits up to 5 seconds for them to exit.
 * 4. Sends SIGKILL to any that remain.
 */
export async function killChildProcesses(): Promise<void> {
  // ── Phase 0: stop all podman piece containers ────────────────────────
  await stopAllPieceContainers();

  const pids = Array.from(_childPids);
  if (pids.length === 0) return;

  console.log(
    `[service-worker] Killing ${pids.length} tracked child process(es)...`,
  );

  // Phase 1: graceful SIGTERM
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process already dead
    }
  }

  // Phase 2: wait up to 5s for all to exit, then SIGKILL survivors
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const remaining = Array.from(_childPids);
      if (remaining.length === 0) {
        clearInterval(interval);
        resolve();
      }
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      const survivors = Array.from(_childPids);
      if (survivors.length > 0) {
        console.log(
          `[service-worker] Force-killing ${survivors.length} remaining child process(es)...`,
        );
        for (const pid of survivors) {
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            // Already dead
          }
        }
      }
      _childPids.clear();
      resolve();
    }, 5000);
  });
}

export async function startServiceWorker() {
  const boss = await getPgBoss();

  // ── Purge any stale spawn jobs left over from a previous worker ──────────
  // This prevents pre-existing queue entries from colliding with the fresh
  // enqueues that recoverAndStartAllServices() is about to issue.
  await boss.deleteQueue(SERVICE_SPAWN_QUEUE);
  await boss.createQueue(SERVICE_SPAWN_QUEUE, { retryLimit: 0 });

  // ── Clear stale runtime state from the DB ────────────────────────────────
  // On worker restart, any PIDs / ports / "running" status in the DB belong
  // to processes from the previous incarnation.  Nullify them so that
  // executeServiceSpawnJob does not attempt to kill a stale PID or skip
  // spawning because it thinks the service is already running.
  await db.execute(
    sql`UPDATE ${services} SET pid = NULL, port = NULL, status = 'stopped' WHERE status = 'running' OR status = 'crashed' OR status = 'deploying'`,
  );

  // ── Enqueue ALL services for spawn BEFORE the worker starts listening ────
  // Critical: if the worker were already running when we enqueue, pre-existing
  // jobs could be processed *concurrently* with our enqueues, and a job that
  // completes early would leave _spawningServices empty — making it impossible
  // for the in-memory guard to catch a second enqueue for the same service.
  await recoverAndStartAllServices();

  // ── Start the spawn queue worker ─────────────────────────────────────────
  await boss.work(
    SERVICE_SPAWN_QUEUE,
    { localConcurrency: 5 },
    async (jobs) => {
      const job = jobs[0];
      if (!job) return;
      try {
        await executeServiceSpawnJob(job.data as ServiceSpawnJob);
      } catch (error) {
        const { serviceId, workspaceId, sessionId } =
          job.data as ServiceSpawnJob;
        console.error(
          `[service-worker] Service spawn failed for ${serviceId}:`,
          error,
        );
        try {
          // Release any port that may have been reserved before the failure
          const reservedPort = _reservedServicePorts.get(serviceId);
          if (reservedPort !== undefined) {
            _reservedPorts.delete(reservedPort);
            _reservedServicePorts.delete(serviceId);
          }
          _spawningServices.delete(serviceId);

          const errMessage =
            error instanceof Error ? error.message : String(error);
          const isSoftError =
            errMessage.includes("has no index.ts") ||
            errMessage.includes("has no Dockerfile") ||
            errMessage.includes(`missing required "image"`) ||
            errMessage.includes(`missing required "entrypoint"`) ||
            errMessage.includes("podman is not available") ||
            errMessage.includes("Missing or empty required secrets");

          if (isSoftError) {
            await db.execute(
              sql`UPDATE ${services} SET port = NULL, pid = NULL, status = 'stopped' WHERE id = ${serviceId}`,
            );
          } else {
            // Atomically increment spawnFailCount
            const [updated] = await db.execute(
              sql`UPDATE ${services} SET spawn_fail_count = spawn_fail_count + 1, port = NULL, pid = NULL, status = 'crashed' WHERE id = ${serviceId} RETURNING spawn_fail_count`,
            );
            const newFailCount: number | undefined = (
              updated as { spawn_fail_count: number } | undefined
            )?.spawn_fail_count;

            // Notify OpenCode so the AI can see the error and fix it — but only
            // within the retry limit to avoid spam across crash loops.
            if (
              newFailCount !== undefined &&
              newFailCount <= MAX_SPAWN_FAIL_RETRIES
            ) {
              const failedService = await getServiceById(
                serviceId,
                workspaceId,
              );
              if (failedService) {
                sendSpawnFailureMessage(
                  failedService,
                  workspaceId,
                  sessionId,
                  errMessage,
                ).catch((notifyErr) => {
                  console.error(
                    `[service-worker] Failed to send spawn failure notification for ${serviceId}:`,
                    notifyErr,
                  );
                });
              }
            }
          }
        } catch (updateError) {
          const targetStatus =
            error instanceof Error &&
            (error.message.includes("has no index.ts") ||
              error.message.includes("has no Dockerfile") ||
              error.message.includes(`missing required "image"`) ||
              error.message.includes(`missing required "entrypoint"`) ||
              error.message.includes("podman is not available") ||
              error.message.includes("Missing or empty required secrets"))
              ? "stopped"
              : "crashed";
          console.error(
            `[service-worker] Failed to update service status to ${targetStatus}:`,
            updateError,
          );
        }
        throw error;
      }
    },
  );

  await boss.work(SERVICE_STOP_QUEUE, { localConcurrency: 1 }, async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    await executeServiceStopJob(job.data as ServiceStopJob);
  });

  // Start periodic cleanup of stuck deployments (run every 60 seconds)
  setInterval(async () => {
    await cleanupStuckDeployments();
  }, 60 * 1000);

  // Run initial cleanup
  await cleanupStuckDeployments();

  console.log("[service-worker] listening for service spawn and stop jobs");
  return boss;
}
