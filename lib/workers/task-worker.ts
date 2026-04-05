import { getPgBoss, TASK_EXECUTION_QUEUE, type TaskExecutionJob, PG_BOSS_CONCURRENCY } from "@/lib/queues/pg-boss";
import { processDueTasks } from "@/lib/services/task-execution.service";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

let boss: Awaited<ReturnType<typeof getPgBoss>> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

async function pollForDueTasks() {
  try {
    await processDueTasks();
  } catch (error) {
    console.error("[task-worker] Error polling for due tasks:", error);
  }
}

export async function startTaskWorker() {
  boss = await getPgBoss();

  boss.on("error", (error) => {
    console.error("[task-worker] pg-boss error:", error);
  });

  // Handle task execution jobs (when AI needs to process a task chat)
  await boss.work(TASK_EXECUTION_QUEUE, { localConcurrency: PG_BOSS_CONCURRENCY }, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    const data = job.data as TaskExecutionJob;
    console.log(`[task-worker] Received task execution job for chat ${data.chatId}, task ${data.taskId}`);
    // The actual chat execution is handled by the chat worker via enqueueChatExecution
    // This worker just handles the polling and enqueuing of task execution
  });

  // Start polling for due tasks
  console.log(`[task-worker] Starting task polling every ${POLL_INTERVAL_MS / 1000} seconds`);
  pollTimer = setInterval(pollForDueTasks, POLL_INTERVAL_MS);

  // Run immediately on start
  await pollForDueTasks();

  return boss;
}

async function shutdown(signal: string) {
  console.log(`[task-worker] received ${signal}, shutting down`);

  if (pollTimer) {
    clearInterval(pollTimer);
  }

  if (boss) {
    await boss.stop();
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});