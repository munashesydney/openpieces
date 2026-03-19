import { PgBoss } from "pg-boss";

export const CHAT_EXECUTION_QUEUE = "ai-chat-execution";
export const SERVICE_SPAWN_QUEUE = "service-spawn";
export const SERVICE_STOP_QUEUE = "service-stop";

declare global {
  var __openpiecesPgBoss: PgBoss | undefined;
  var __openpiecesPgBossStart: Promise<PgBoss> | undefined;
}

function createBoss() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PgBoss(process.env.DATABASE_URL);
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
