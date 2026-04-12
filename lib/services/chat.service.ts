import { createGateway, GatewayInternalServerError } from "@ai-sdk/gateway";
import type { ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { OPENPIECES_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/orchestratorV3";
import { EVENTS_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/events";
import { ARCHITECTURE_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/architectureV2";
import { BRAIN_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/brain";
import { QA_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/qa";
import { COMPACTOR_PROMPT } from "@/lib/ai-chat/prompts/compactor";
import { getContextInfo } from "@/lib/ai-chat/context-manager";
import { getModelLimits } from "@/lib/ai-chat/model-context";
import { truncateToolOutput } from "@/lib/ai-chat/tool-truncation";
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
import { getChatAbortController } from "@/lib/workers/chat-controller";

const DEFAULT_CHAT_TITLE = "New chat";
const DEFAULT_MODEL = process.env.AI_MODEL ?? "deepseek/deepseek-v3.2";

const CONTEXT_ERROR_PHRASES = [
  "maximum context length",
  "context length is only",
  "Input too long",
  "token count exceeds",
  "reduce the length of the messages",
  "reduce the length of the input",
  "input_tokens",
  "Please reduce the length",
];

function isContextWindowError(error: unknown): boolean {
  const haystack = collectErrorStrings(error);
  return CONTEXT_ERROR_PHRASES.some((phrase) => haystack.includes(phrase));
}

function collectErrorStrings(error: unknown, depth = 0): string {
  if (depth > 4 || error == null) return "";
  const parts: string[] = [];
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    parts.push(error.message ?? "");
    parts.push((error as any).responseBody ?? "");
    parts.push(collectErrorStrings((error as any).cause, depth + 1));
    // Also check .data which Gateway errors expose
    if ((error as any).data) {
      try { parts.push(JSON.stringify((error as any).data)); } catch { }
    }
  } else if (typeof error === "object") {
    try { parts.push(JSON.stringify(error)); } catch { }
  }
  return parts.join(" ");
}

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

export async function createAiChat(
  data: Pick<NewAiChat, "workspaceId" | "userId">,
  agentType: string = "orchestrator"
) {
  const [chat] = await db
    .insert(aiChats)
    .values({
      workspaceId: data.workspaceId,
      userId: data.userId,
      title: DEFAULT_CHAT_TITLE,
      status: "idle",
      model: DEFAULT_MODEL,
      agentType,
    })
    .returning();

  return serializeChat(chat);
}

export async function getAiChatsForWorkspace(
  workspaceId: string,
  userId: string,
  page: number = 1,
  pageSize: number = 10,
  agentType?: string
) {
  if (!isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return { data: [], total: 0 };
  }

  const offset = (page - 1) * pageSize;
  const conditions = [and(eq(aiChats.workspaceId, workspaceId), eq(aiChats.userId, userId))];
  if (agentType) {
    conditions.push(eq(aiChats.agentType, agentType));
  }

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(aiChats)
      .where(and(...conditions))
      .orderBy(desc(aiChats.updatedAt), desc(aiChats.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(aiChats)
      .where(and(...conditions)),
  ]);

  return {
    data: data.map(serializeChat),
    total: totalResult[0]?.count ?? 0,
  };
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

export async function setChatStopped(chatId: string, stopped: boolean): Promise<void> {
  await db
    .update(aiChats)
    .set({ stopped, updatedAt: new Date() })
    .where(eq(aiChats.id, chatId));
}

export async function isChatStopped(chatId: string): Promise<boolean> {
  const [chat] = await db
    .select({ stopped: aiChats.stopped })
    .from(aiChats)
    .where(eq(aiChats.id, chatId))
    .limit(1);
  return chat?.stopped ?? false;
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
      toolCalls: aiMessages.toolCalls,
      toolResults: aiMessages.toolResults,
    })
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.chatId, chatId),
        eq(aiMessages.isCompacted, false)
      )
    )
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));

  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
  })) as any[];
}

/** Public wrapper for context estimation in API routes */
export async function getModelMessagesForContext(chatId: string) {
  return getModelMessages(chatId);
}

export async function compactChat(
  chatId: string,
  _systemPrompt: string
): Promise<{ summary: string; archivedCount: number }> {
  // Load only non-compacted messages for transcript
  const messages = await db
    .select()
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.chatId, chatId),
        eq(aiMessages.isCompacted, false)
      )
    )
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));

  const archivedCount = messages.length;

  // Build transcript with tool activity
  const transcript = messages
    .map((m) => {
      const parts: string[] = [];

      // Message text content (truncated)
      let content = m.content;
      if (content && content.length > 3000) {
        content = content.slice(0, 3000) + "\n[content truncated]";
      }
      if (content) parts.push(content);

      // Tool calls: include tool name and action
      const toolCalls = Array.isArray(m.toolCalls) ? (m.toolCalls as AiToolCall[]) : [];
      if (toolCalls.length > 0) {
        const callSummaries = toolCalls.map((tc) => {
          const action = tc.input && typeof tc.input === 'object' && 'action' in tc.input
            ? ` (${(tc.input as any).action})`
            : '';
          return `  → called ${tc.toolName}${action}`;
        });
        parts.push(callSummaries.join("\n"));
      }

      // Tool results: brief snippet of each output
      const toolResults = Array.isArray(m.toolResults) ? (m.toolResults as AiToolResult[]) : [];
      if (toolResults.length > 0) {
        const resultSummaries = toolResults.map((tr) => {
          if (tr.error) return `  ← ${tr.toolName}: ERROR: ${tr.error}`;
          const output = typeof tr.output === 'string'
            ? tr.output
            : JSON.stringify(tr.output);
          const snippet = output.length > 300
            ? output.slice(0, 300) + '... [truncated]'
            : output;
          return `  ← ${tr.toolName}: ${snippet}`;
        });
        parts.push(resultSummaries.join("\n"));
      }

      return `${m.role}: ${parts.join("\n")}`;
    })
    .join("\n\n");

  // Cap the full transcript to ~80k chars (~40k tokens)
  const MAX_TRANSCRIPT_CHARS = 80000;
  const truncatedTranscript = transcript.length > MAX_TRANSCRIPT_CHARS
    ? "[Earlier messages truncated]\n\n" + transcript.slice(-MAX_TRANSCRIPT_CHARS)
    : transcript;

  console.log(`[chat.service] Compacting chat: ${archivedCount} messages, transcript ${transcript.length} chars, sent ${truncatedTranscript.length} chars`);

  const result = streamText({
    model: getModel(),
    system: COMPACTOR_PROMPT,
    messages: [
      {
        role: "user",
        content: `Please summarize this conversation:\n\n${truncatedTranscript}`,
      },
    ] as ModelMessage[],
    maxOutputTokens: 4000,
    stopWhen: stepCountIs(2),
  });

  let summary = "";
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      summary += part.text;
    }
  }

  return { summary: summary.trim(), archivedCount };
}

export async function replaceMessagesWithSummary(
  chatId: string,
  summary: string,
  archivedCount: number
): Promise<void> {
  // Archive old messages instead of deleting
  await db
    .update(aiMessages)
    .set({ isCompacted: true, updatedAt: new Date() })
    .where(
      and(
        eq(aiMessages.chatId, chatId),
        eq(aiMessages.isCompacted, false)
      )
    );

  // Create a compaction divider message (shown as UI indicator, not as chat text)
  await createAiMessage({
    chatId,
    role: "assistant",
    content: `${archivedCount} messages compacted`,
    status: "compacted",
  });

  // Create the summary as a model-only context message (hidden from UI via compacted status)
  await createAiMessage({
    chatId,
    role: "user",
    content: `## Prior Conversation Summary\n\n${summary}\n\n[System: The conversation was compacted to save context space. Resume exactly where you left off. If you were executing tool calls or a multi-step task, continue from where you stopped — do not start over or ask the user what to do. Do not mention the compaction to the user.]`,
    status: "compacted",
  });
}

export async function executeAiChatJob(
  input: { chatId: string; workspaceId: string; userId: string },
  signal?: AbortSignal
) {
  const chat = await getAiChatRecordById(input.chatId, input.userId);
  if (!chat) {
    throw new Error(`Chat ${input.chatId} was not found.`);
  }

  await updateAiChatStatus(chat.id, "processing");

  let assistantMessage = await createAiMessage({
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

  const systemPrompt =
    chat.agentType === "events"
      ? EVENTS_CHAT_SYSTEM_PROMPT
      : chat.agentType === "architecture"
        ? ARCHITECTURE_CHAT_SYSTEM_PROMPT
        : chat.agentType === "brain"
          ? BRAIN_CHAT_SYSTEM_PROMPT
          : chat.agentType === "qa"
            ? QA_CHAT_SYSTEM_PROMPT
            : OPENPIECES_CHAT_SYSTEM_PROMPT;

  let attempt = 0;
  const MAX_ATTEMPTS = 3;

  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    let isContextError = false;
    // Reset per-attempt state
    content = "";
    toolCalls = [];
    toolResults = [];

    const loopState = {
      callCounts: new Map<string, number>(),
    };

    try {
      const messages = await getModelMessages(chat.id);
      const contextInfo = await getContextInfo(chat.model ?? DEFAULT_MODEL, messages, systemPrompt);
      if (contextInfo.needsCompaction) {
        const { summary, archivedCount } = await compactChat(chat.id, systemPrompt);
        await replaceMessagesWithSummary(chat.id, summary, archivedCount);
      }

      const modelLimits = await getModelLimits(chat.model ?? DEFAULT_MODEL);

      const result = streamText({
        model: getModel(),
        system: systemPrompt,
        messages: await getModelMessages(chat.id),
        tools: createTools({
          workspaceId: input.workspaceId,
          userId: input.userId,
          chatId: input.chatId,
          agentType: chat.agentType,
          loopState,
        }),
        maxOutputTokens: modelLimits.output,
        temperature: 0.7,
        abortSignal: signal,
        onAbort: async () => {
          await updateAiMessage(assistantMessage.id, {
            content: content || "Response was stopped.",
            status: "complete",
            toolCalls,
            toolResults,
          });
          await updateAiChatStatus(chat.id, "stopped");
        },
        stopWhen: stepCountIs(500),
        onError: ({ error }) => {
          if (isContextWindowError(error)) {
            isContextError = true;
            console.log("[chat.service] Context window error detected via onError");
          }
          console.error("[chat.service] AI stream error:", (error as any)?.message);
        },
      });

      // Poll DB every 500ms to check if the user requested a stop
      const stopPollInterval = setInterval(async () => {
        if (signal?.aborted) {
          clearInterval(stopPollInterval);
          return;
        }
        const stopped = await isChatStopped(chat.id);
        if (stopped) {
          getChatAbortController(chat.id)?.abort();
          clearInterval(stopPollInterval);
        }
      }, 500);

      for await (const part of result.fullStream) {
        if (signal?.aborted) break;

        // Handle stream-level errors (these don't throw — they arrive as parts)
        if (part.type === "error") {
          if (isContextWindowError(part.error)) {
            isContextError = true;
          }
          break;
        }

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
          // Truncate large tool outputs to prevent context overflow
          const rawOutput = part.output ?? null;
          const truncated = truncateToolOutput(
            typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput)
          );

          toolResults = [
            ...toolResults.filter((resultItem) => resultItem.toolCallId !== part.toolCallId),
            {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              output: sanitizeJson(truncated.content),
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

      clearInterval(stopPollInterval);

      console.log(`[chat.service] Stream ended: isContextError=${isContextError}, contentLen=${content.length}, attempt=${attempt}/${MAX_ATTEMPTS}`);

      // If a context error was detected (via onError or error part), compact and retry
      if (isContextError && attempt < MAX_ATTEMPTS) {
        console.log("[chat.service] Context window exceeded, compacting and retrying...");
        try {
          const { summary, archivedCount } = await compactChat(chat.id, systemPrompt);
          await replaceMessagesWithSummary(chat.id, summary, archivedCount);
          // Create a fresh assistant message after the compaction divider
          content = "";
          toolCalls = [];
          toolResults = [];
          assistantMessage = await createAiMessage({
            chatId: chat.id,
            role: "assistant",
            content: "",
            status: "streaming",
            toolCalls: [],
            toolResults: [],
          });
          loopState.callCounts.clear(); // Reset loop tracker on compaction retry
          continue; // Retry with compacted context
        } catch (compactError) {
          console.error("[chat.service] Compaction failed:", compactError);
          // Fall through to error handling below
        }
      }

      // If there was an error but no retry possible, mark as failed
      if (isContextError) {
        await updateAiMessage(assistantMessage.id, {
          content: "The conversation exceeded the model's context limit and compaction was not sufficient. Please start a new chat.",
          status: "error",
          toolCalls,
          toolResults,
        });
        await updateAiChatStatus(chat.id, "failed", {
          error: "Context window exceeded",
        });
        break;
      }

      await updateAiMessage(assistantMessage.id, {
        content,
        status: "complete",
        toolCalls,
        toolResults,
      });

      await updateAiChatStatus(chat.id, "completed");
      break; // Exit retry loop on success
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const isContextLengthError =
        isContextError || isContextWindowError(error);

      if (isContextLengthError && attempt < MAX_ATTEMPTS && !content) {
        try {
          const { summary, archivedCount } = await compactChat(chat.id, systemPrompt);
          await replaceMessagesWithSummary(chat.id, summary, archivedCount);
          // Create a fresh assistant message after the compaction divider
          assistantMessage = await createAiMessage({
            chatId: chat.id,
            role: "assistant",
            content: "",
            status: "streaming",
            toolCalls: [],
            toolResults: [],
          });
          continue; // Retry with compacted context
        } catch {
          // compaction failed, fall through to error handling
        }
      }

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
}
