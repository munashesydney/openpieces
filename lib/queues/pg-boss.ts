import { PgBoss } from "pg-boss";

export const CHAT_EXECUTION_QUEUE = "ai-chat-execution";
export const AGENT_CHAT_EXECUTION_QUEUE = "agent-chat-execution";
export const SERVICE_SPAWN_QUEUE = "service-spawn";
export const SERVICE_STOP_QUEUE = "service-stop";
export const TASK_EXECUTION_QUEUE = "task-execution";
export const BRAIN_QUEUE = "brain-processing";
export const WEBHOOK_DELIVERY_QUEUE = "webhook-delivery";

declare global {
  var __openpiecesPgBoss: PgBoss | undefined;
  var __openpiecesPgBossStart: Promise<PgBoss> | undefined;
}

// pg-boss manages its own connection pool — cap it to avoid exhausting PostgreSQL connections.
const PG_BOSS_POOL_SIZE = parseInt(process.env.PG_BOSS_POOL_SIZE ?? "5", 10);
export const PG_BOSS_CONCURRENCY = parseInt(
  process.env.PG_BOSS_CONCURRENCY ?? "10",
  10,
);
if (isNaN(PG_BOSS_POOL_SIZE) || PG_BOSS_POOL_SIZE < 1) {
  throw new Error(
    `Invalid PG_BOSS_POOL_SIZE value: ${process.env.PG_BOSS_POOL_SIZE}. Must be a positive integer.`,
  );
}

function createBoss() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PgBoss({
    connectionString: process.env.DATABASE_URL,
    max: PG_BOSS_POOL_SIZE,
  });
}

export async function getPgBoss(): Promise<PgBoss> {
  if (globalThis.__openpiecesPgBoss) {
    return globalThis.__openpiecesPgBoss;
  }

  if (!globalThis.__openpiecesPgBossStart) {
    globalThis.__openpiecesPgBossStart = (async () => {
      const boss = createBoss();
      await boss.start();

      const existingQueue = await boss.getQueue(CHAT_EXECUTION_QUEUE);
      if (!existingQueue) {
        await boss.createQueue(CHAT_EXECUTION_QUEUE);
      }

      const existingAgentQueue = await boss.getQueue(
        AGENT_CHAT_EXECUTION_QUEUE,
      );
      if (!existingAgentQueue) {
        await boss.createQueue(AGENT_CHAT_EXECUTION_QUEUE);
      }

      const existingSpawnQueue = await boss.getQueue(SERVICE_SPAWN_QUEUE);
      if (!existingSpawnQueue) {
        await boss.createQueue(SERVICE_SPAWN_QUEUE, { retryLimit: 0 });
      }

      const existingStopQueue = await boss.getQueue(SERVICE_STOP_QUEUE);
      if (!existingStopQueue) {
        await boss.createQueue(SERVICE_STOP_QUEUE);
      }

      const existingTaskQueue = await boss.getQueue(TASK_EXECUTION_QUEUE);
      if (!existingTaskQueue) {
        await boss.createQueue(TASK_EXECUTION_QUEUE);
      }

      const existingBrainQueue = await boss.getQueue(BRAIN_QUEUE);
      if (!existingBrainQueue) {
        await boss.createQueue(BRAIN_QUEUE);
      }

      const existingWebhookQueue = await boss.getQueue(WEBHOOK_DELIVERY_QUEUE);
      if (!existingWebhookQueue) {
        await boss.createQueue(WEBHOOK_DELIVERY_QUEUE, { retryLimit: 5, retryBackoff: true });
      }

      globalThis.__openpiecesPgBoss = boss;
      return boss;
    })();
  }

  return globalThis.__openpiecesPgBossStart;
}

export type ChatExecutionJob = {
  chatId: string;
  workspaceId: string;
  userId: string;
  /** Chat mode: defaults to "agent" if omitted. */
  mode?: "agent" | "chat";
};

export async function enqueueChatExecution(
  job: ChatExecutionJob,
): Promise<string> {
  const boss = await getPgBoss();
  const jobId = await boss.send(CHAT_EXECUTION_QUEUE, job);
  return jobId ?? "";
}

export async function enqueueAgentChatExecution(
  job: ChatExecutionJob,
): Promise<string> {
  const boss = await getPgBoss();
  const jobId = await boss.send(AGENT_CHAT_EXECUTION_QUEUE, job);
  return jobId ?? "";
}

export async function cancelChatExecution(jobId: string): Promise<void> {
  const boss = await getPgBoss();
  await boss.cancel(CHAT_EXECUTION_QUEUE, jobId);
}

export type ServiceSpawnJob = {
  serviceId: string;
  workspaceId: string;
  sessionId?: string;
};

export async function enqueueServiceSpawn(job: ServiceSpawnJob) {
  const boss = await getPgBoss();
  const { updateService } = await import("../services/service.service");
  await updateService(
    job.serviceId,
    job.workspaceId,
    { status: "deploying" },
    "system",
  );
  return boss.send(SERVICE_SPAWN_QUEUE, job);
}

export type ServiceStopJob = {
  serviceId: string;
  workspaceId: string;
};

export async function enqueueServiceStop(job: ServiceStopJob) {
  const boss = await getPgBoss();
  return boss.send(SERVICE_STOP_QUEUE, job);
}

export type TaskExecutionJob = {
  chatId: string;
  taskId: string;
  workspaceId: string;
  userId: string;
};

export async function enqueueTaskExecution(job: TaskExecutionJob) {
  const boss = await getPgBoss();
  return boss.send(TASK_EXECUTION_QUEUE, job);
}

export type BrainJob = {
  workspaceId: string;
  action: "ingest" | "reinforce";
};

export async function enqueueBrainJob(job: BrainJob) {
  const boss = await getPgBoss();
  return boss.send(BRAIN_QUEUE, job);
}

export type WebhookDeliveryJob = {
  webhookId: string;
  workspaceId: string;
  eventName: string;
  payload: any;
};

export async function enqueueWebhookDelivery(job: WebhookDeliveryJob) {
  const boss = await getPgBoss();
  return boss.send(WEBHOOK_DELIVERY_QUEUE, job);
}
