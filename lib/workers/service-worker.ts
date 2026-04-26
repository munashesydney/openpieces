import { spawn } from "child_process";
import fs from "fs";
import net from "net";
import { and, eq, sql } from "drizzle-orm";
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
  const { serviceId, workspaceId, sessionId } = job;

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

  // If service has a PID, check if it's still alive and kill it (force restart)
  if (service.pid) {
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

  const port = await findFreePort();
  _reservedServicePorts.set(serviceId, port);
  const entryPoint = "index.ts";
  const directory = service.directory.trim();

  await resetServiceLog(directory);
  await appendServiceLog(
    directory,
    "info",
    `Spawning service "${service.title}" on port ${port}: ${entryPoint}`,
  );

  const proc = spawn(
    "deno",
    [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-env",
      "--allow-write",
      "--allow-run", // if the piece needs to spawn subprocesses
      "--allow-sys", // for OS info: hostname, osRelease, etc.
      "--allow-ffi", // if using native/FFI libraries
      entryPoint,
      String(port),
    ],
    {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: `./pieces/${directory}`,
      env: {
        ...process.env,
        ...secretEnv,
        LD_LIBRARY_PATH: "/opt/deno-glibc",
        OPENPIECES_USER_ID: workspaceOwnerId,
        OPENPIECES_WORKSPACE_ID: service.workspaceId,
        OPENPIECES_SERVICE_ID: serviceId,
        OPENPIECES_WORKFLOW_ID: service.workflowId ?? "",
        OPENPIECES_INTERNAL_URL:
          process.env.OPENPIECES_INTERNAL_URL ??
          `http://app:${process.env.APP_PORT ?? 3141}`,
        OPENPIECES_SERVICE_PUBLIC_URL: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3141"}/api/s/${serviceId}`,
      },
    },
  );

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
    console.error(
      `[service-worker][${service.title}] spawn error:`,
      err.message,
    );
    void appendServiceLog(directory, "error", `Spawn error: ${err.message}`);
  });
  proc.on("exit", (code, signal) => {
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

    await updateService(
      serviceId,
      workspaceId,
      { port, pid: proc.pid, status: "running", spawnFailCount: 0 },
      "system",
    );
    await appendServiceLog(
      directory,
      "info",
      `Service is healthy on port ${port}`,
    );

    // Spawn the QA AI agent to check health asynchronously after 30 seconds
    setTimeout(async () => {
      try {
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
    // Send failure message to opencode immediately (pg-boss will retry separately)
    await sendSpawnFailureMessage(
      service,
      workspaceId,
      sessionId,
      `Service did not become healthy on port ${port}`,
    );
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

export async function startServiceWorker() {
  const boss = await getPgBoss();

  await boss.work(
    SERVICE_SPAWN_QUEUE,
    { localConcurrency: 10 },
    async (jobs) => {
      const job = jobs[0];
      if (!job) return;
      try {
        await executeServiceSpawnJob(job.data as ServiceSpawnJob);
      } catch (error) {
        const { serviceId, workspaceId } = job.data as ServiceSpawnJob;
        console.error(
          `[service-worker] Service spawn failed for ${serviceId}:`,
          error,
        );
        try {
          // Release any port that may have been reserved before the failure
          // (port was allocated inside executeServiceSpawnJob but may not
          // have been cleaned up if the error occurred before the else branch)
          const reservedPort = _reservedServicePorts.get(serviceId);
          if (reservedPort !== undefined) {
            _reservedPorts.delete(reservedPort);
            _reservedServicePorts.delete(serviceId);
          }
          _spawningServices.delete(serviceId);

          // Soft errors (missing index.ts, missing/empty required secrets)
          // should NOT increment spawnFailCount - they are permanent conditions.
          const errMessage =
            error instanceof Error ? error.message : String(error);
          const isSoftError =
            errMessage.includes("has no index.ts") ||
            errMessage.includes("Missing or empty required secrets");

          if (isSoftError) {
            await db.execute(
              sql`UPDATE ${services} SET port = NULL, pid = NULL, status = 'stopped' WHERE id = ${serviceId}`,
            );
          } else {
            // Atomically increment spawnFailCount so concurrent failures
            // don't race on read-then-write and all see the same value.
            await db.execute(
              sql`UPDATE ${services} SET spawn_fail_count = spawn_fail_count + 1, port = NULL, pid = NULL, status = 'crashed' WHERE id = ${serviceId}`,
            );
          }
        } catch (updateError) {
          const targetStatus =
            error instanceof Error &&
            (error.message.includes("has no index.ts") ||
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

  // Recover stale services and start valid ones
  await recoverAndStartAllServices();

  // Start periodic cleanup of stuck deployments (run every 60 seconds)
  setInterval(async () => {
    await cleanupStuckDeployments();
  }, 60 * 1000);

  // Run initial cleanup
  await cleanupStuckDeployments();

  console.log("[service-worker] listening for service spawn and stop jobs");
  return boss;
}
