import { createGateway } from "@ai-sdk/gateway";
import type { ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import { and, asc, desc, eq } from "drizzle-orm";
import { OPENPIECES_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompt";
import type {
  AiChatListItem,
  AiChatMessage,
  AiChatStatus,
  AiMessageStatus,
  AiToolCall,
  AiToolResult,
} from "@/lib/ai-chat/types";
import { db } from "@/lib/db";
import {
  aiChats,
  aiMessages,
  type AiChat,
  type AiMessage,
  type NewAiChat,
  type NewAiMessage,
} from "@/lib/db/schema";
import { createTools } from "@/lib/tools/registry";
import { isValidUuid } from "@/lib/utils/uuid";

const DEFAULT_CHAT_TITLE = "New chat";
const DEFAULT_MODEL = process.env.AI_MODEL ?? "deepseek/deepseek-v3.2";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

function requireGatewayApiKey() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY is not set.");
  }
}

function getModel() {
  requireGatewayApiKey();
  return gateway.languageModel(DEFAULT_MODEL);
}

function sanitizeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function serializeChat(chat: AiChat): AiChatListItem {
  return {
    id: chat.id,
    workspaceId: chat.workspaceId,
    userId: chat.userId,
    title: chat.title,
    status: chat.status as AiChatStatus,
    error: chat.error,
    model: chat.model,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

function serializeMessage(message: AiMessage): AiChatMessage {
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    status: message.status as AiMessageStatus,
    content: message.content,
    toolCalls: Array.isArray(message.toolCalls)
      ? (message.toolCalls as AiToolCall[])
      : [],
    toolResults: Array.isArray(message.toolResults)
      ? (message.toolResults as AiToolResult[])
      : [],
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
}

function createChatTitleFromMessage(content: string): string {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return DEFAULT_CHAT_TITLE;
  }

  return normalized.length <= 48 ? normalized : `${normalized.slice(0, 45)}...`;
}

function getToolResultError(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "Tool execution failed.";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "Tool execution failed.";
  }
}

export async function createAiChat(data: Pick<NewAiChat, "workspaceId" | "userId">) {
  const [chat] = await db
    .insert(aiChats)
    .values({
      workspaceId: data.workspaceId,
      userId: data.userId,
      title: DEFAULT_CHAT_TITLE,
      status: "idle",
      model: DEFAULT_MODEL,
    })
    .returning();

  return serializeChat(chat);
}

export async function getAiChatsForWorkspace(workspaceId: string, userId: string) {
  if (!isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return [];
  }

  const chats = await db
    .select()
    .from(aiChats)
    .where(and(eq(aiChats.workspaceId, workspaceId), eq(aiChats.userId, userId)))
    .orderBy(desc(aiChats.updatedAt), desc(aiChats.createdAt));

  return chats.map(serializeChat);
}

export async function getAiChatById(chatId: string, userId: string) {
  if (!isValidUuid(chatId) || !isValidUuid(userId)) {
    return null;
  }

  const [chat] = await db
    .select()
    .from(aiChats)
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)))
    .limit(1);

  return chat ? serializeChat(chat) : null;
}

export async function getAiChatRecordById(chatId: string, userId: string) {
  if (!isValidUuid(chatId) || !isValidUuid(userId)) {
    return null;
  }

  const [chat] = await db
    .select()
    .from(aiChats)
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)))
    .limit(1);

  return chat ?? null;
}

export async function getAiMessages(chatId: string) {
  if (!isValidUuid(chatId)) {
    return [];
  }

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.chatId, chatId))
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));

  return messages.map(serializeMessage);
}

export async function createAiMessage(data: {
  chatId: string;
  role: NewAiMessage["role"];
  content: string;
  status?: NewAiMessage["status"];
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
}) {
  const [message] = await db
    .insert(aiMessages)
    .values({
      chatId: data.chatId,
      role: data.role,
      content: data.content,
      status: data.status ?? "complete",
      toolCalls: sanitizeJson(data.toolCalls ?? []),
      toolResults: sanitizeJson(data.toolResults ?? []),
    })
    .returning();

  return serializeMessage(message);
}

export async function updateAiChatStatus(
  chatId: string,
  status: AiChatStatus,
  options?: {
    error?: string | null;
    title?: string;
  }
) {
  await db
    .update(aiChats)
    .set({
      status,
      error: options?.error ?? null,
      title: options?.title,
      updatedAt: new Date(),
    })
    .where(eq(aiChats.id, chatId));
}

export async function updateAiMessage(
  messageId: string,
  data: {
    content?: string;
    status?: AiMessageStatus;
    toolCalls?: AiToolCall[];
    toolResults?: AiToolResult[];
  }
) {
  await db
    .update(aiMessages)
    .set({
      content: data.content,
      status: data.status,
      toolCalls: data.toolCalls ? sanitizeJson(data.toolCalls) : undefined,
      toolResults: data.toolResults ? sanitizeJson(data.toolResults) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(aiMessages.id, messageId));
}

export async function appendUserMessageAndMarkPending(input: {
  chatId: string;
  content: string;
}) {
  const existingMessages = await getAiMessages(input.chatId);
  const title =
    existingMessages.length === 0
      ? createChatTitleFromMessage(input.content)
      : undefined;

  const message = await createAiMessage({
    chatId: input.chatId,
    role: "user",
    content: input.content,
    status: "complete",
  });

  await updateAiChatStatus(input.chatId, "pending", {
    title,
  });

  return message;
}

async function getModelMessages(chatId: string): Promise<ModelMessage[]> {
  const messages = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content,
    })
    .from(aiMessages)
    .where(eq(aiMessages.chatId, chatId))
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));

  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) as ModelMessage[];
}

export async function executeAiChatJob(input: {
  chatId: string;
  workspaceId: string;
  userId: string;
}) {
  const chat = await getAiChatRecordById(input.chatId, input.userId);
  if (!chat) {
    throw new Error(`Chat ${input.chatId} was not found.`);
  }

  await updateAiChatStatus(chat.id, "processing");

  const assistantMessage = await createAiMessage({
    chatId: chat.id,
    role: "assistant",
    content: "",
    status: "streaming",
    toolCalls: [],
    toolResults: [],
  });

  let content = "";
  let toolCalls: AiToolCall[] = [];
  let toolResults: AiToolResult[] = [];

  try {
    const result = streamText({
      model: getModel(),
      system: OPENPIECES_CHAT_SYSTEM_PROMPT,
      messages: await getModelMessages(chat.id),
      tools: createTools({
        workspaceId: input.workspaceId,
        userId: input.userId,
        chatId: input.chatId,
      }),
      stopWhen: stepCountIs(6),
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        content += part.text;
        await updateAiMessage(assistantMessage.id, {
          content,
          status: "streaming",
        });
        continue;
      }

      if (part.type === "tool-call") {
        toolCalls = [
          ...toolCalls,
          {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: sanitizeJson(part.input ?? {}),
          },
        ];

        await updateAiMessage(assistantMessage.id, {
          toolCalls,
        });
        continue;
      }

      if (part.type === "tool-result") {
        toolResults = [
          ...toolResults.filter((resultItem) => resultItem.toolCallId !== part.toolCallId),
          {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: sanitizeJson(part.output ?? null),
          },
        ];

        await updateAiMessage(assistantMessage.id, {
          toolResults,
        });
        continue;
      }

      if (part.type === "tool-error") {
        toolResults = [
          ...toolResults.filter((resultItem) => resultItem.toolCallId !== part.toolCallId),
          {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: null,
            error: getToolResultError(part.error),
          },
        ];

        await updateAiMessage(assistantMessage.id, {
          toolResults,
        });
      }
    }

    await updateAiMessage(assistantMessage.id, {
      content,
      status: "complete",
      toolCalls,
      toolResults,
    });

    await updateAiChatStatus(chat.id, "completed");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected AI error occurred.";

    await updateAiMessage(assistantMessage.id, {
      content:
        content ||
        "I hit an error while generating the response. Please try again.",
      status: "error",
      toolCalls,
      toolResults,
    });

    await updateAiChatStatus(chat.id, "failed", {
      error: errorMessage,
    });

    throw error;
  }
}
