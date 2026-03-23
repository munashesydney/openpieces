import { PgBoss } from "pg-boss";

export const CHAT_EXECUTION_QUEUE = "ai-chat-execution";
export const SERVICE_SPAWN_QUEUE = "service-spawn";
export const SERVICE_STOP_QUEUE = "service-stop";
export const TASK_EXECUTION_QUEUE = "task-execution";

declare global {
  var __openpiecesPgBoss: PgBoss | undefined;
  var __openpiecesPgBossStart: Promise<PgBoss> | undefined;
}

// pg-boss manages its own connection pool — cap it to avoid exhausting PostgreSQL connections.
const PG_BOSS_POOL_SIZE = parseInt(process.env.PG_BOSS_POOL_SIZE ?? "5", 10);
if (isNaN(PG_BOSS_POOL_SIZE) || PG_BOSS_POOL_SIZE < 1) {
  throw new Error(`Invalid PG_BOSS_POOL_SIZE value: ${process.env.PG_BOSS_POOL_SIZE}. Must be a positive integer.`);
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

      const existingSpawnQueue = await boss.getQueue(SERVICE_SPAWN_QUEUE);
      if (!existingSpawnQueue) {
        await boss.createQueue(SERVICE_SPAWN_QUEUE);
      }

      const existingStopQueue = await boss.getQueue(SERVICE_STOP_QUEUE);
      if (!existingStopQueue) {
        await boss.createQueue(SERVICE_STOP_QUEUE);
      }

      const existingTaskQueue = await boss.getQueue(TASK_EXECUTION_QUEUE);
      if (!existingTaskQueue) {
        await boss.createQueue(TASK_EXECUTION_QUEUE);
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
};

export async function enqueueChatExecution(job: ChatExecutionJob) {
  const boss = await getPgBoss();
  return boss.send(CHAT_EXECUTION_QUEUE, job);
}

export type ServiceSpawnJob = {
  serviceId: string;
  workspaceId: string;
};

export async function enqueueServiceSpawn(job: ServiceSpawnJob) {
  const boss = await getPgBoss();
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
