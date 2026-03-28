import { CHAT_EXECUTION_QUEUE, type ChatExecutionJob, getPgBoss } from "@/lib/queues/pg-boss";
import { executeAiChatJob, setChatStopped } from "@/lib/services/chat.service";
import {
  registerChatController,
  removeChatController,
} from "./chat-controller";

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

    const { chatId, workspaceId, userId } = job.data as ChatExecutionJob;

    // Reset stopped flag so a re-sent message can run
    await setChatStopped(chatId, false);

    const abortController = registerChatController(chatId, job.id);

    try {
      await executeAiChatJob({ chatId, workspaceId, userId }, abortController.signal);
    } finally {
      removeChatController(chatId);
    }
  });

  return boss;
}
