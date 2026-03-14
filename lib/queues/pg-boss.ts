import { PgBoss } from "pg-boss";

export const CHAT_EXECUTION_QUEUE = "ai-chat-execution";

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
