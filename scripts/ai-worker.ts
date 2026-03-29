import type { PgBoss } from "pg-boss";
import { startChatWorker, startAgentChatWorker } from "../lib/workers/chat-worker";
import { startServiceWorker } from "../lib/workers/service-worker";
import { startTaskWorker } from "../lib/workers/task-worker";
import { startBrainWorker } from "../lib/workers/brain-worker";

let boss: PgBoss | undefined;

async function shutdown(signal: string) {
  console.log(`[ai-worker] received ${signal}, shutting down`);

  if (boss) {
    await boss.stop();
  }

  process.exit(0);
}

async function main() {
  const [chatBoss, agentBoss] = await Promise.all([
    startChatWorker(),
    startAgentChatWorker(),
    startServiceWorker(),
    startTaskWorker(),
    startBrainWorker(),
  ]);
  boss = chatBoss;
  console.log("[ai-worker] listening for AI chat jobs, agent chat jobs, service spawn jobs, task execution, and brain processing");
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
