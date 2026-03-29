import type { ToolContext } from "@/lib/tools/registry";
import type { RuntimeToolInput } from "./definition";
import {
  createAiChat,
  appendUserMessageAndMarkPending,
  getAiChatRecordById,
  getAiMessages,
} from "@/lib/services/chat.service";
import { enqueueAgentChatExecution } from "@/lib/queues/pg-boss";

export async function executeRuntime(input: RuntimeToolInput, context: ToolContext) {
  const { action, seconds, agentType, prompt, chatId } = input;

  switch (action) {
    case "sleep": {
      if (!seconds) {
        throw new Error("seconds is required for sleep action");
      }
      const ms = seconds * 1000;
      await new Promise((resolve) => setTimeout(resolve, ms));
      return { success: true, sleptSeconds: seconds };
    }

    case "spawn_agent": {
      if (!agentType) {
        throw new Error("agentType is required for spawn_agent action");
      }
      if (!prompt) {
        throw new Error("prompt is required for spawn_agent action");
      }
      const chat = await createAiChat(
        { workspaceId: context.workspaceId, userId: context.userId },
        agentType
      );
      await appendUserMessageAndMarkPending({
        chatId: chat.id,
        content: prompt,
      });
      await enqueueAgentChatExecution({
        chatId: chat.id,
        workspaceId: context.workspaceId,
        userId: context.userId,
      });
      return { chatId: chat.id, status: "queued" };
    }

    case "check_agent_progress": {
      if (!chatId) {
        throw new Error("chatId is required for check_agent_progress action");
      }
      const chat = await getAiChatRecordById(chatId, context.userId);
      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }
      if (chat.status === "completed") {
        const messages = await getAiMessages(chatId);
        const lastAssistantMessage = [...messages]
          .reverse()
          .find((m) => m.role === "assistant");
        return {
          status: "completed",
          response: lastAssistantMessage?.content ?? "",
        };
      }
      if (chat.status === "failed") {
        return { status: "failed", error: chat.error };
      }
      if (chat.status === "stopped") {
        const messages = await getAiMessages(chatId);
        const lastAssistantMessage = [...messages]
          .reverse()
          .find((m) => m.role === "assistant");
        return {
          status: "stopped",
          response: lastAssistantMessage?.content ?? "",
        };
      }
      return { status: chat.status };
    }

    default: {
      throw new Error(`Unknown action: ${action}. Valid actions are: sleep, spawn_agent, check_agent_progress.`);
    }
  }
}
