import { spawn } from "child_process";
import net from "net";
import { eq } from "drizzle-orm";
import { SERVICE_SPAWN_QUEUE, type ServiceSpawnJob, getPgBoss } from "@/lib/queues/pg-boss";
import { getServiceById, updateService } from "@/lib/services/service.service";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";
import { getSecrets } from "@/lib/services/secret.service";
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
      },
    }
  );

  proc.stdout?.on("data", (data: Buffer) => {
    console.log(`[service-worker][${service.title}] ${data.toString().trim()}`);
  });
  proc.stderr?.on("data", (data: Buffer) => {
    console.error(`[service-worker][${service.title}] ${data.toString().trim()}`);
  });
  proc.on("error", (err) => {
    console.error(`[service-worker][${service.title}] spawn error:`, err.message);
  });
  proc.on("exit", (code, signal) => {
    if (code !== null) {
      console.error(`[service-worker][${service.title}] exited with code ${code}`);
    } else if (signal) {
      console.error(`[service-worker][${service.title}] killed by signal ${signal}`);
    }
  });

  proc.unref();

  const healthy = await pollHealth(port);

  if (healthy) {
    await updateService(serviceId, workspaceId, { port });
    console.log(`[service-worker] Service "${service.title}" is healthy on port ${port}`);
  } else {
    console.error(`[service-worker] Service "${service.title}" did not become healthy on port ${port}`);
  }
}

export async function startServiceWorker() {
  const boss = await getPgBoss();

  await boss.work(SERVICE_SPAWN_QUEUE, async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    await executeServiceSpawnJob(job.data as ServiceSpawnJob);
  });

  console.log("[service-worker] listening for service spawn jobs");
  return boss;
}
