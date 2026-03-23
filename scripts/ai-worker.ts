import type { PgBoss } from "pg-boss";
import { startChatWorker } from "../lib/workers/chat-worker";
import { startServiceWorker } from "../lib/workers/service-worker";
import { startTaskWorker } from "../lib/workers/task-worker";

let boss: PgBoss | undefined;

async function shutdown(signal: string) {
  console.log(`[ai-worker] received ${signal}, shutting down`);

  if (boss) {
    await boss.stop();
  }

  process.exit(0);
}

async function main() {
  const [chatBoss] = await Promise.all([
    startChatWorker(),
    startServiceWorker(),
    startTaskWorker(),
  ]);
  boss = chatBoss;
  console.log("[ai-worker] listening for AI chat jobs, service spawn jobs, and task execution");
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

main().catch((error) => {
  console.error("[ai-worker] failed to start:", error);
  process.exit(1);
});
