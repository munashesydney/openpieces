import type { PgBoss } from "pg-boss";
import { startChatWorker } from "../lib/workers/chat-worker";

let boss: PgBoss | undefined;

async function shutdown(signal: string) {
  console.log(`[ai-worker] received ${signal}, shutting down`);

  if (boss) {
    await boss.stop();
  }

  process.exit(0);
}

async function main() {
  boss = await startChatWorker();
  console.log("[ai-worker] listening for AI chat jobs");
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
