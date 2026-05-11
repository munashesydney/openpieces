import type { PgBoss } from "pg-boss";
import {
  startChatWorker,
  startAgentChatWorker,
} from "../lib/workers/chat-worker";
import {
  startServiceWorker,
  killChildProcesses,
} from "../lib/workers/service-worker";
import { startTaskWorker } from "../lib/workers/task-worker";
import { startBrainWorker } from "../lib/workers/brain-worker";

let boss: PgBoss | undefined;

async function shutdown(signal: string) {
  console.log(`[ai-worker] received ${signal}, shutting down`);

  // Safety net: force-exit if shutdown takes longer than 15 seconds.
  // This prevents a hanging boss.stop() from blocking process.exit(0)
  // and leaving orphaned child processes behind.
  const forceExitTimer = setTimeout(() => {
    console.log("[ai-worker] force exit after timeout");
    process.exit(0);
  }, 15_000);
  forceExitTimer.unref();

  // Phase 1: kill tracked Deno child processes so they don't orphan.
  await killChildProcesses();

  // Phase 2: stop pg-boss (gracefully drains queue workers).
  if (boss) {
    await boss.stop();
  }

  clearTimeout(forceExitTimer);
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
  console.log(
    "[ai-worker] listening for AI chat jobs, agent chat jobs, service spawn jobs, task execution, and brain processing",
  );
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
