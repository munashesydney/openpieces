import { spawn } from "child_process";
import net from "net";
import { eq } from "drizzle-orm";
import {
  SERVICE_SPAWN_QUEUE,
  SERVICE_STOP_QUEUE,
  type ServiceSpawnJob,
  type ServiceStopJob,
  enqueueServiceSpawn,
  getPgBoss,
} from "@/lib/queues/pg-boss";
import { getServiceById, updateService } from "@/lib/services/service.service";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";
import { getSecrets } from "@/lib/services/secret.service";
import { getRequiredSecrets } from "@/lib/services/service-required-secrets.service";
import { appendServiceLog, resetServiceLog } from "@/lib/services/service-log-stream";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";

const PORT_START = 8001;
const PORT_END = 9000;

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
  const usedPorts = await db
    .select({ port: services.port })
    .from(services)
    .where(eq(services.port, services.port));

  const dbPorts = new Set(usedPorts.map((r) => r.port).filter(Boolean));

  for (let port = PORT_START; port <= PORT_END; port++) {
    if (dbPorts.has(port)) continue;
    const bound = await isPortBoundByOS(port);
    if (!bound) return port;
  }

  throw new Error("No free port found in range 8001–9000");
}

async function pollHealth(port: number, timeoutMs = 45000, intervalMs = 500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://localhost:${port}/health`, { signal: controller.signal });
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

  // Check if all required secrets are set
  const requiredSecrets = await getRequiredSecrets(serviceId);
  if (requiredSecrets.length > 0) {
    const workspaceOwnerId = (await getWorkspaceOwnerId(workspaceId)) ?? "";
    const { data: secrets } = await getSecrets(workspaceId, workspaceOwnerId, 1, 500);
    const secretKeys = new Set(secrets.map(s => s.key));
    
    const missingSecrets = requiredSecrets
      .filter(req => !secretKeys.has(req.secretKey))
      .map(req => req.secretKey);
    
    if (missingSecrets.length > 0) {
      throw new Error(`Missing required secrets: ${missingSecrets.join(", ")}`);
    }
  }

  // Derive the workspace owner user ID so we can pass it into the service process.
  const workspaceOwnerId = (await getWorkspaceOwnerId(workspaceId)) ?? "";

  // Load all personal secrets for this workspace/user and inject as environment variables.
  let secretEnv: Record<string, string> = {};
  try {
    const { data: secrets } = await getSecrets(workspaceId, workspaceOwnerId, 1, 500);
    secretEnv = secrets.reduce<Record<string, string>>((acc, secret) => {
      if (secret.key && typeof secret.value === "string") {
        acc[secret.key] = secret.value;
      }
      return acc;
    }, {});
  } catch (err) {
    console.error(
      `[service-worker] Failed to load secrets for workspace ${workspaceId} and user ${workspaceOwnerId}:`,
      err
    );
  }

  const port = await findFreePort();
  const entryPoint = `./pieces/${service.directory.trim()}/index.ts`;
  const directory = service.directory.trim();

  await resetServiceLog(directory);
  await appendServiceLog(
    directory,
    "info",
    `Spawning service "${service.title}" on port ${port}: ${entryPoint}`
  );
  console.log(`[service-worker] Spawning service "${service.title}" on port ${port}: ${entryPoint}`);

  const proc = spawn(
    "deno",
    ["run", "--allow-net", "--allow-read", "--allow-env", entryPoint, String(port)],
    {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...secretEnv,
        LD_LIBRARY_PATH: "/opt/deno-glibc",
        OPENPIECES_USER_ID: workspaceOwnerId,
        OPENPIECES_WORKSPACE_ID: service.workspaceId,
        OPENPIECES_SERVICE_ID: serviceId,
        OPENPIECES_WORKFLOW_ID: service.workflowId ?? "",
      },
    }
  );

  proc.stdout?.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`[service-worker][${service.title}] ${message}`);
      void appendServiceLog(directory, "info", message);
    }
  });
  proc.stderr?.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      console.error(`[service-worker][${service.title}] ${message}`);
      void appendServiceLog(directory, "error", message);
    }
  });
  proc.on("error", (err) => {
    console.error(`[service-worker][${service.title}] spawn error:`, err.message);
    void appendServiceLog(directory, "error", `Spawn error: ${err.message}`);
  });
  proc.on("exit", (code, signal) => {
    if (code !== null) {
      console.error(`[service-worker][${service.title}] exited with code ${code}`);
      void appendServiceLog(directory, "error", `Process exited with code ${code}`);
    } else if (signal) {
      console.error(`[service-worker][${service.title}] killed by signal ${signal}`);
      void appendServiceLog(directory, "error", `Process killed by signal ${signal}`);
    }
  });

  proc.unref();

  const healthy = await pollHealth(port);

  if (healthy) {
    await updateService(serviceId, workspaceId, { port, pid: proc.pid, status: "running" });
    await appendServiceLog(directory, "info", `Service is healthy on port ${port}`);
    console.log(`[service-worker] Service "${service.title}" is healthy on port ${port}`);
  } else {
    await appendServiceLog(directory, "error", `Service did not become healthy on port ${port}`);
    console.error(`[service-worker] Service "${service.title}" did not become healthy on port ${port}`);
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
    await appendServiceLog(directory, "info", "Service is not running (no PID found)");
    console.log(`[service-worker] Service ${serviceId} has no PID, nothing to stop`);
    return;
  }

  await appendServiceLog(directory, "info", `Stopping service (PID: ${service.pid})`);
  console.log(`[service-worker] Stopping service ${serviceId} (PID: ${service.pid})`);

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

    await updateService(serviceId, workspaceId, { port: null, pid: null, status: "stopped" });
    await appendServiceLog(directory, "info", "Service stopped successfully");
    console.log(`[service-worker] Service ${serviceId} stopped successfully`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await appendServiceLog(directory, "error", `Failed to stop service: ${errorMessage}`);
    console.error(`[service-worker] Failed to stop service ${serviceId}:`, errorMessage);
    // Still mark as stopped in DB even if kill failed
    await updateService(serviceId, workspaceId, { port: null, pid: null, status: "stopped" });
  }
}

async function recoverAndStartAllServices() {
  console.log("[service-worker] Recovering services...");

  // 1. Find all services that claim to be running
  const runningServices = await db
    .select()
    .from(services)
    .where(eq(services.status, "running"));

  // 2. Check if each PID is still alive, reset if not
  for (const svc of runningServices) {
    if (!svc.pid) {
      await updateService(svc.id, svc.workspaceId, { port: null, pid: null, status: "stopped" });
      console.log(`[service-worker] Reset stale service ${svc.id} (no PID)`);
      continue;
    }
    try {
      process.kill(svc.pid, 0); // Signal 0 = check if process exists
    } catch {
      // PID is dead, reset to stopped
      await updateService(svc.id, svc.workspaceId, { port: null, pid: null, status: "stopped" });
      console.log(`[service-worker] Reset stale service ${svc.id} (dead PID ${svc.pid})`);
    }
  }

  // 3. Find all stopped services and try to start valid ones
  const stoppedServices = await db
    .select()
    .from(services)
    .where(eq(services.status, "stopped"));

  for (const svc of stoppedServices) {
    if (!svc.directory?.trim()) continue; // Skip services without directory

    // Check if required secrets are set
    const requiredSecrets = await getRequiredSecrets(svc.id);
    if (requiredSecrets.length === 0) {
      // No required secrets, enqueue directly
      await enqueueServiceSpawn({ serviceId: svc.id, workspaceId: svc.workspaceId });
      console.log(`[service-worker] Enqueued service ${svc.id} (${svc.title}) - no required secrets`);
      continue;
    }

    const workspaceOwnerId = (await getWorkspaceOwnerId(svc.workspaceId)) ?? "";
    const { data: secrets } = await getSecrets(svc.workspaceId, workspaceOwnerId, 1, 500);
    const secretKeys = new Set(secrets.map((s) => s.key));
    const missingSecrets = requiredSecrets
      .filter((req) => !secretKeys.has(req.secretKey))
      .map((req) => req.secretKey);

    if (missingSecrets.length === 0) {
      await enqueueServiceSpawn({ serviceId: svc.id, workspaceId: svc.workspaceId });
      console.log(`[service-worker] Enqueued service ${svc.id} (${svc.title})`);
    } else {
      console.log(`[service-worker] Skipping service ${svc.id} (${svc.title}) - missing secrets: ${missingSecrets.join(", ")}`);
    }
  }

  console.log("[service-worker] Service recovery complete");
}

export async function startServiceWorker() {
  const boss = await getPgBoss();

  await boss.work(SERVICE_SPAWN_QUEUE, async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    await executeServiceSpawnJob(job.data as ServiceSpawnJob);
  });

  await boss.work(SERVICE_STOP_QUEUE, async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    await executeServiceStopJob(job.data as ServiceStopJob);
  });

  // Recover stale services and start valid ones
  await recoverAndStartAllServices();

  console.log("[service-worker] listening for service spawn and stop jobs");
  return boss;
}
