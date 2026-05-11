import {
  getPgBoss,
  TASK_EXECUTION_QUEUE,
  type TaskExecutionJob,
  PG_BOSS_CONCURRENCY,
} from "@/lib/queues/pg-boss";
import { processDueTasks } from "@/lib/services/task-execution.service";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

let boss: Awaited<ReturnType<typeof getPgBoss>> | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

async function pollForDueTasks() {
  try {
    await processDueTasks();
  } catch (error) {
    console.error("[task-worker] Error polling for due tasks:", error);
  }
}

function scheduleNextPoll() {
  pollTimer = setTimeout(async () => {
    await pollForDueTasks();
    scheduleNextPoll();
  }, POLL_INTERVAL_MS);
}

export async function startTaskWorker() {
  boss = await getPgBoss();

  boss.on("error", (error) => {
    console.error("[task-worker] pg-boss error:", error);
  });

  // Handle task execution jobs (when AI needs to process a task chat)
  await boss.work(
    TASK_EXECUTION_QUEUE,
    { localConcurrency: PG_BOSS_CONCURRENCY },
    async (jobs) => {
      const job = jobs[0];
      if (!job) {
        return;
      }

      const data = job.data as TaskExecutionJob;
      console.log(
        `[task-worker] Received task execution job for chat ${data.chatId}, task ${data.taskId}`,
      );
      // The actual chat execution is handled by the chat worker via enqueueChatExecution
      // This worker just handles the polling and enqueuing of task execution
    },
  );

  // Run immediately on start
  await pollForDueTasks();

  // Start recursive polling (prevents overlapping polls)
  scheduleNextPoll();
  console.log(
    `[task-worker] Starting task polling every ${POLL_INTERVAL_MS / 1000} seconds`,
  );

  return boss;
}
