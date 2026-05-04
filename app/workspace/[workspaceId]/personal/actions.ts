"use server";

import type { AiChatListItem } from "@/lib/ai-chat/types";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import {
  appendUserMessageAndMarkPending,
  createAiChat,
  getAiChatById,
  getAiChatRecordById,
} from "@/lib/services/chat.service";
import { updateWorkspaceDefaultModel } from "@/lib/services/workspace-settings.service";
import { db } from "@/lib/db";
import { aiChats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type SendAiMessageActionResult = {
  chat: AiChatListItem;
};

export async function sendAiMessageAction(
  workspaceId: string,
  chatId: string | null,
  content: string,
  mode?: "agent" | "chat",
): Promise<SendAiMessageActionResult> {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error("content is required.");
  }

  const { user } = await requireWorkspaceOwner(workspaceId);

  let effectiveChatId = chatId;
  if (effectiveChatId) {
    const existingChat = await getAiChatRecordById(effectiveChatId, user.id);
    if (!existingChat) {
      throw new Error("Chat not found.");
    }
  } else {
    const chat = await createAiChat(
      {
        workspaceId,
        userId: user.id,
      },
      "orchestrator",
    );
    effectiveChatId = chat.id;
  }

  await appendUserMessageAndMarkPending({
    chatId: effectiveChatId,
    content: trimmedContent,
  });

  await enqueueChatExecution({
    chatId: effectiveChatId,
    workspaceId,
    userId: user.id,
    mode,
  });

  const chat = await getAiChatById(effectiveChatId, user.id);
  if (!chat) {
    throw new Error("Chat not found.");
  }

  return { chat };
}

export async function updateWorkspaceModelAction(
  workspaceId: string,
  model: string,
) {
  await requireWorkspaceOwner(workspaceId);
  await updateWorkspaceDefaultModel(workspaceId, model);
}

export async function updateChatModelAction(
  workspaceId: string,
  chatId: string,
  model: string,
) {
  const { user } = await requireWorkspaceOwner(workspaceId);

  await db
    .update(aiChats)
    .set({ model, updatedAt: new Date() })
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, user.id)));
}
