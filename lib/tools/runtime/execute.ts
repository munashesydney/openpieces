import type { ToolContext } from "@/lib/tools/registry";
import { getSpawnPolicy, type RuntimeToolInput } from "./definition";
import {
  createAiChat,
  appendUserMessageAndMarkPending,
  getAiChatRecordById,
  getAiMessages,
} from "@/lib/services/chat.service";
import { enqueueAgentChatExecution } from "@/lib/queues/pg-boss";

function assertSpawnAllowed(
  callerAgentType: string,
  targetAgentType: string,
): void {
  const policy = getSpawnPolicy(callerAgentType);
  if (!policy.canSpawn) {
    throw new Error("This agent cannot spawn sub-agents.");
  }
  if (policy.allowedTarget !== targetAgentType) {
    throw new Error(
      `This agent can only spawn "${policy.allowedTarget}", not "${targetAgentType}".`,
    );
  }
}

export async function executeRuntime(
  input: RuntimeToolInput,
  context: ToolContext,
) {
  const { action, seconds, prompt, chatId } = input;
  const agentType = "agentType" in input ? input.agentType : undefined;

  switch (action) {
    case "sleep": {
      if (!seconds) {
        throw new Error("seconds is required for sleep action");
      }
      const ms = seconds * 1000;
      await new Promise((resolve) => setTimeout(resolve, ms));
      return {
        success: true,
        sleptSeconds: seconds,
        message: "Sleep complete — continue with your plan",
      };
    }

    case "spawn_agent": {
      if (!agentType) {
        throw new Error("agentType is required for spawn_agent action");
      }
      if (!prompt) {
        throw new Error("prompt is required for spawn_agent action");
      }
      assertSpawnAllowed(context.agentType, agentType);

      // Use existing chat if chatId provided, otherwise create a new one
      let targetChatId: string;
      if (input.chatId) {
        const existing = await getAiChatRecordById(
          input.chatId,
          context.userId,
        );
        if (!existing) {
          throw new Error(`Chat ${input.chatId} not found`);
        }
        targetChatId = existing.id;
      } else {
        const chat = await createAiChat(
          { workspaceId: context.workspaceId, userId: context.userId },
          agentType,
        );
        targetChatId = chat.id;
      }

      const finalPrompt = `[YOU HAVE BEEN SPAWNED BY ${context.agentType.toUpperCase()} AI]\n${prompt}`;

      await appendUserMessageAndMarkPending({
        chatId: targetChatId,
        content: finalPrompt,
      });
      await enqueueAgentChatExecution({
        chatId: targetChatId,
        workspaceId: context.workspaceId,
        userId: context.userId,
      });
      return { chatId: targetChatId, status: "queued" };
    }

    case "ask_question": {
      // Enforce single ask_question call per execution loop
      const ASK_QUESTION_KEY = "runtime:ask_question";
      const prevCalls =
        context.loopState?.callCounts.get(ASK_QUESTION_KEY) ?? 0;
      context.loopState?.callCounts.set(ASK_QUESTION_KEY, prevCalls + 1);

      if (prevCalls > 0) {
        return "already_asked";
      }

      // Return true immediately - UI will render the questions
      return true;
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
      const _exhaustive: never = action;
      throw new Error(`Unknown runtime action: ${String(_exhaustive)}`);
    }
  }
}
