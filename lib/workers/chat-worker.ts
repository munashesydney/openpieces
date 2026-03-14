import { CHAT_EXECUTION_QUEUE, type ChatExecutionJob, getPgBoss } from "@/lib/queues/pg-boss";
import { executeAiChatJob } from "@/lib/services/chat.service";

export async function startChatWorker() {
  const boss = await getPgBoss();

  boss.on("error", (error) => {
    console.error("[ai-worker] pg-boss error:", error);
  });

  await boss.work(CHAT_EXECUTION_QUEUE, async (jobs) => {
    const job = jobs[0];
    if (!job) {
      return;
    }

    await executeAiChatJob(job.data as ChatExecutionJob);
  });

  return boss;
}
