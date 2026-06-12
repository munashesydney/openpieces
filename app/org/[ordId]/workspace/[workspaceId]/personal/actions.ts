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
import { deleteAiChat, renameAiChat } from "@/lib/services/chat.service";
import { updateWorkspaceDefaultModel } from "@/lib/services/workspace-settings.service";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { aiChats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type SendAiMessageActionResult =
  | { chat: AiChatListItem }
  | { error: string };

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

  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    let effectiveChatId = chatId;
    if (effectiveChatId) {
      const existingChat = await getAiChatRecordById(effectiveChatId, user.id);
      if (!existingChat) {
        return { error: "Chat not found." };
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
      return { error: "Chat not found." };
    }

    return { chat };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return { error: message };
  }
}

export async function updateWorkspaceModelAction(
  workspaceId: string,
  model: string,
) {
  const { workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";
  await updateWorkspaceDefaultModel(workspaceId, model);
}

export async function updateChatModelAction(
  workspaceId: string,
  chatId: string,
  model: string,
) {
  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  await db
    .update(aiChats)
    .set({ model, updatedAt: new Date() })
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, user.id)));
}

export type DeleteChatActionResult = { success: true } | { error: string };

export async function deleteChatAction(
  workspaceId: string,
  chatId: string,
): Promise<DeleteChatActionResult> {
  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    const result = await deleteAiChat(chatId, user.id);
    if (!result) {
      return { error: "Chat not found." };
    }

    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal`);
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return { error: message };
  }
}

export type RenameChatActionResult = { success: true } | { error: string };

export async function renameChatAction(
  workspaceId: string,
  chatId: string,
  title: string,
): Promise<RenameChatActionResult> {
  const { user, workspace } = await requireWorkspaceOwner(workspaceId);
  const orgId = workspace.orgId || "s";

  try {
    const result = await renameAiChat(chatId, user.id, title);
    if (!result) {
      return { error: "Chat not found." };
    }

    revalidatePath(`/org/${orgId}/workspace/${workspaceId}/personal`);
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return { error: message };
  }
}
