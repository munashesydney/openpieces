import { createGateway } from "@ai-sdk/gateway";
import type { ModelMessage } from "ai";
import { stepCountIs, streamText, generateText, Output } from "ai";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { OPENPIECES_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/orchestratorV3";
import { EVENTS_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/events";
import { ARCHITECTURE_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/architectureV2";
import { BRAIN_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/brain";
import { QA_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/qa";
import { COMPACTOR_PROMPT } from "@/lib/ai-chat/prompts/compactor";
import { TITLE_GENERATOR_PROMPT } from "@/lib/ai-chat/prompts/title-generator";
import {
  WORKSPACE_CONTEXT_PLACEHOLDER,
  buildWorkspaceContext,
  type WorkspaceContextData,
} from "@/lib/ai-chat/prompts/universal";
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
  users,
  workspaces,
  workspaceSettings,
  type AiChat,
  type AiMessage,
  type NewAiChat,
  type NewAiMessage,
} from "@/lib/db/schema";
import { createTools } from "@/lib/tools/registry";
import { isValidUuid } from "@/lib/utils/uuid";
import { z } from "zod";
import {
  getWorkspaceChatLimitInfo,
  getWorkspaceSettings,
} from "@/lib/services/workspace-settings.service";
import { updateWorkflowExecutionByChatId } from "@/lib/services/workflow-execution.service";
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

const MODEL_ERROR_PHRASES = [
  "thinking.type.enabled",
  "thinking.type.adaptive",
  "is not supported for this model",
];

function isModelCompatibilityError(error: unknown): boolean {
  const haystack = collectErrorStrings(error);
  return MODEL_ERROR_PHRASES.some((phrase) => haystack.includes(phrase));
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
      try {
        parts.push(JSON.stringify((error as any).data));
      } catch {}
    }
  } else if (typeof error === "object") {
    try {
      parts.push(JSON.stringify(error));
    } catch {}
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

function getModel(model?: string | null) {
  requireGatewayApiKey();
  return gateway.languageModel(model ?? DEFAULT_MODEL);
}

/**
 * Strip empty text blocks from messages before sending to Anthropic.
 * Anthropic's API rejects messages where a text content block is empty.
 */
function sanitizeForAnthropic(messages: ModelMessage[]): ModelMessage[] {
  const result = messages
    .map((msg) => {
      if (typeof msg.content === "string") {
        // String content — filter out empty strings
        if (msg.content.trim() === "") return null;
        return msg;
      }

      if (Array.isArray(msg.content)) {
        const filtered = msg.content.filter((block) => {
          if (block.type === "text") return block.text.trim() !== "";
          // tool_use, tool_result, image, reasoning, file etc — keep as-is
          return true;
        });

        if (filtered.length === 0) return null;
        return { ...msg, content: filtered };
      }

      return msg;
    })
    .filter(Boolean) as ModelMessage[];

  if (messages.length !== result.length) {
    const removed = messages.length - result.length;
    console.log(
      `[chat.service] sanitizeForAnthropic removed ${removed} message(s) with empty content`,
    );
  }

  return result;
}

/**
 * Build provider options for Anthropic models.
 *
 * - Newer models (claude-opus-4+, claude-sonnet-4+, claude-haiku-4.5+):
 *   use `thinking.type: "adaptive"` (letting the model decide how much
 *   thinking to do based on prompt complexity).
 * - Older models (claude-3-*): use budget-based `thinking.type: "enabled"`.
 *
 * If a model throws an error about thinking config, it will be caught
 * and displayed as a friendly "please pick another model" message.
 */
function buildAnthropicProviderOptions(modelId: string) {
  // Newer Claude models (4.x series) support adaptive thinking
  if (
    modelId.includes("opus-4") ||
    modelId.includes("sonnet-4") ||
    modelId.includes("haiku-4.5")
  ) {
    return {
      anthropic: {
        thinking: {
          type: "adaptive" as const,
        },
      },
    };
  }

  // Older Claude models (claude-3-*) - use budget-based thinking
  return {
    anthropic: {
      thinking: {
        type: "enabled" as const,
        budgetTokens: 12000,
      },
    },
  };
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
    reasoning: message.reasoning ?? null,
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

/**
 * Generate an AI-powered title for a conversation based on the first user message.
 * Falls back to returning null — caller should keep the existing title.
 */
async function generateChatTitle(firstMessage: string): Promise<string | null> {
  try {
    const { output } = await generateText({
      model: getModel("deepseek/deepseek-v4-flash"),
      system: TITLE_GENERATOR_PROMPT,
      prompt: firstMessage.slice(0, 500),
      output: Output.object({
        schema: z.object({
          title: z.string(),
        }),
      }),
    });
    const title = output.title.trim();
    return title || null;
  } catch {
    return null;
  }
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
  agentType: string = "orchestrator",
) {
  // ── Daily chat limit check ───────────────────────────────────────────────
  const { used, limit } = await getWorkspaceChatLimitInfo(data.workspaceId);
  if (used >= limit) {
    throw new Error(
      `Daily chat limit reached (${used}/${limit}). ` +
        `Reset the counter from the workspace to continue.`,
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const settings = await getWorkspaceSettings(data.workspaceId);
  const model = settings?.defaultModel ?? DEFAULT_MODEL;

  const [chat] = await db
    .insert(aiChats)
    .values({
      workspaceId: data.workspaceId,
      userId: data.userId,
      title: DEFAULT_CHAT_TITLE,
      status: "idle",
      model: model,
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
  agentType?: string,
) {
  if (!isValidUuid(workspaceId) || !isValidUuid(userId)) {
    return { data: [], total: 0 };
  }

  const offset = (page - 1) * pageSize;
  const conditions = [
    and(eq(aiChats.workspaceId, workspaceId), eq(aiChats.userId, userId)),
  ];
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
  reasoning?: string;
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
      reasoning: data.reasoning ?? null,
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
  },
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

export async function setChatStopped(
  chatId: string,
  stopped: boolean,
): Promise<void> {
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
    reasoning?: string | null;
  },
) {
  await db
    .update(aiMessages)
    .set({
      content: data.content,
      status: data.status,
      toolCalls: data.toolCalls ? sanitizeJson(data.toolCalls) : undefined,
      toolResults: data.toolResults
        ? sanitizeJson(data.toolResults)
        : undefined,
      reasoning: data.reasoning !== undefined ? data.reasoning : undefined,
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

  // Fire off AI title generation for first message (don't await — it's non-critical)
  if (existingMessages.length === 0) {
    generateChatTitle(input.content).then((aiTitle) => {
      if (aiTitle) {
        updateAiChatStatus(input.chatId, "pending", { title: aiTitle }).catch(
          () => {},
        );
      }
    });
  }

  return message;
}

async function getModelMessages(chatId: string): Promise<ModelMessage[]> {
  const rows = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content,
      toolCalls: aiMessages.toolCalls,
      toolResults: aiMessages.toolResults,
      reasoning: aiMessages.reasoning,
    })
    .from(aiMessages)
    .where(
      and(eq(aiMessages.chatId, chatId), eq(aiMessages.isCompacted, false)),
    )
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));

  const result: ModelMessage[] = [];

  for (const message of rows) {
    const toolCalls = Array.isArray(message.toolCalls)
      ? (message.toolCalls as AiToolCall[])
      : [];
    const toolResults = Array.isArray(message.toolResults)
      ? (message.toolResults as AiToolResult[])
      : [];

    if (message.role === "assistant") {
      const content: any[] = [];
      const reasoning = message.reasoning ?? "";
      if (reasoning.trim()) {
        content.push({ type: "reasoning", text: reasoning });
      }
      if (message.content?.trim()) {
        content.push({ type: "text", text: message.content });
      }
      for (const tc of toolCalls) {
        content.push({
          type: "tool-call",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.input ?? {},
        });
      }
      if (content.length > 0) {
        result.push({ role: "assistant", content } as ModelMessage);
      }

      // Tool results go in a separate "tool" message right after.
      // CRITICAL: every tool-call MUST have a matching tool-result in the
      // conversation, otherwise the Vercel AI SDK throws "Tool result is
      // missing for tool call …". This can happen when a stream is
      // interrupted between a tool-call and its result.
      if (toolCalls.length > 0 || toolResults.length > 0) {
        // Index existing results by toolCallId for quick lookup
        const resultMap = new Map<string, AiToolResult>();
        for (const tr of toolResults) {
          resultMap.set(tr.toolCallId, tr);
        }

        // Walk every tool-call and pair it with a result. Inject an error
        // result for orphaned calls that lost their result.
        const pairedResults: AiToolResult[] = toolCalls.map((tc) => {
          const existing = resultMap.get(tc.toolCallId);
          if (existing) {
            resultMap.delete(tc.toolCallId); // consume it
            return existing;
          }
          return {
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            output: null,
            error:
              "Tool result was not received (stream may have been interrupted).",
          };
        });

        // Append any orphaned tool-results that have no matching call
        for (const tr of resultMap.values()) {
          pairedResults.push(tr);
        }

        const toolContent = pairedResults.map((tr) => ({
          type: "tool-result" as const,
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          ...(tr.error
            ? { output: { type: "error-text" as const, value: tr.error } }
            : {
                output: {
                  type: "json" as const,
                  value: (tr.output ?? null) as any,
                },
              }),
        }));
        result.push({ role: "tool", content: toolContent } as ModelMessage);
      }
    } else {
      // User messages keep string content as-is
      result.push({
        role: message.role as "user",
        content: message.content ?? "",
      } as ModelMessage);
    }
  }

  return result;
}

/** Public wrapper for context estimation in API routes */
export async function getModelMessagesForContext(chatId: string) {
  return getModelMessages(chatId);
}

export async function compactChat(
  chatId: string,
  _systemPrompt: string,
  model?: string | null,
): Promise<{ summary: string; archivedCount: number }> {
  // Load only non-compacted messages for transcript
  const messages = await db
    .select()
    .from(aiMessages)
    .where(
      and(eq(aiMessages.chatId, chatId), eq(aiMessages.isCompacted, false)),
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
      const toolCalls = Array.isArray(m.toolCalls)
        ? (m.toolCalls as AiToolCall[])
        : [];
      if (toolCalls.length > 0) {
        const callSummaries = toolCalls.map((tc) => {
          const action =
            tc.input && typeof tc.input === "object" && "action" in tc.input
              ? ` (${(tc.input as any).action})`
              : "";
          return `  → called ${tc.toolName}${action}`;
        });
        parts.push(callSummaries.join("\n"));
      }

      // Tool results: brief snippet of each output
      const toolResults = Array.isArray(m.toolResults)
        ? (m.toolResults as AiToolResult[])
        : [];
      if (toolResults.length > 0) {
        const resultSummaries = toolResults.map((tr) => {
          if (tr.error) return `  ← ${tr.toolName}: ERROR: ${tr.error}`;
          const output =
            typeof tr.output === "string"
              ? tr.output
              : JSON.stringify(tr.output);
          const snippet =
            output.length > 300
              ? output.slice(0, 300) + "... [truncated]"
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
  const truncatedTranscript =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? "[Earlier messages truncated]\n\n" +
        transcript.slice(-MAX_TRANSCRIPT_CHARS)
      : transcript;

  console.log(
    `[chat.service] Compacting chat: ${archivedCount} messages, transcript ${transcript.length} chars, sent ${truncatedTranscript.length} chars`,
  );

  const result = streamText({
    model: getModel(model ?? DEFAULT_MODEL),
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
  archivedCount: number,
): Promise<void> {
  // Archive old messages instead of deleting
  await db
    .update(aiMessages)
    .set({ isCompacted: true, updatedAt: new Date() })
    .where(
      and(eq(aiMessages.chatId, chatId), eq(aiMessages.isCompacted, false)),
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
  input: {
    chatId: string;
    workspaceId: string;
    userId: string;
    mode?: "agent" | "chat";
  },
  signal?: AbortSignal,
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
  let reasoningText = "";
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

  // Inject workspace context at the {{WORKSPACE_CONTEXT}} placeholder
  let injectedPrompt = systemPrompt;
  if (systemPrompt.includes(WORKSPACE_CONTEXT_PLACEHOLDER)) {
    try {
      const [workspaceRows, settingsRows, userRows] = await Promise.all([
        db
          .select({
            name: workspaces.name,
            agentName: workspaces.agentName,
            userNickname: workspaces.userNickname,
          })
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .limit(1),
        db
          .select({ timezone: workspaceSettings.timezone })
          .from(workspaceSettings)
          .where(eq(workspaceSettings.workspaceId, input.workspaceId))
          .limit(1),
        db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1),
      ]);

      const workspace = workspaceRows[0];
      const settings = settingsRows[0];
      const user = userRows[0];

      if (workspace && user) {
        const timezone = settings?.timezone ?? "UTC";
        const { getAllFeatureFlags } =
          await import("@/lib/services/feature-flags.service");
        const featureFlags = await getAllFeatureFlags();
        const contextData: WorkspaceContextData = {
          workspaceName: workspace.name,
          timezone,
          currentTime: new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            dateStyle: "full",
            timeStyle: "long",
          }).format(new Date()),
          agentName: workspace.agentName ?? "Assistant",
          userNickname: workspace.userNickname ?? "User",
          userName: user.name,
          featureFlags,
        };
        injectedPrompt = systemPrompt.replace(
          WORKSPACE_CONTEXT_PLACEHOLDER,
          buildWorkspaceContext(contextData),
        );
      }
    } catch (err) {
      console.error("[chat.service] Failed to inject workspace context:", err);
    }
  }

  // HACK: Strip leading markdown heading artifacts to reduce model's tendency to
  // "continue" the system prompt text as if it were a prefix completion.
  const cleanedSystemPrompt = injectedPrompt.replace(/^#+\s*/m, "").trimStart();

  let attempt = 0;
  const MAX_ATTEMPTS = 3;

  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    let isContextError = false;
    // Reset per-attempt state
    content = "";
    reasoningText = "";
    toolCalls = [];
    toolResults = [];

    const loopState = {
      callCounts: new Map<string, number>(),
    };

    try {
      const messages = await getModelMessages(chat.id);
      const contextInfo = await getContextInfo(
        chat.model ?? DEFAULT_MODEL,
        messages,
        systemPrompt,
      );
      if (contextInfo.needsCompaction) {
        const { summary, archivedCount } = await compactChat(
          chat.id,
          systemPrompt,
          chat.model,
        );
        await replaceMessagesWithSummary(chat.id, summary, archivedCount);
      }

      const modelLimits = await getModelLimits(chat.model ?? DEFAULT_MODEL);

      // Include system prompt as first message in messages array instead of
      // using the `system` parameter, to work around a Vercel AI Gateway bug
      // where the system prompt leaks into the model's response output.
      // Note: For Anthropic models, we must use the `system` parameter instead
      // because Anthropic's API rejects `system`-role entries in the messages array.
      const selectedModelId = chat.model ?? DEFAULT_MODEL;
      const isAnthropicModel = selectedModelId.startsWith("anthropic/");

      let modelMessages = await getModelMessages(chat.id);
      console.log(
        `[chat.service] Pre-stream message count=${modelMessages.length}, model="${selectedModelId}", anthropic=${isAnthropicModel}`,
      );
      for (const m of modelMessages) {
        const contentPreview =
          typeof m.content === "string"
            ? JSON.stringify(m.content.slice(0, 80))
            : `[array of ${m.content.length} blocks]`;
        console.log(`  msg role="${m.role}" content=${contentPreview}`);
      }

      // Always sanitize empty content — Anthropic rejects empty text blocks
      const before = modelMessages.length;
      modelMessages = sanitizeForAnthropic(modelMessages);
      if (modelMessages.length !== before) {
        console.log(
          `[chat.service] Removed ${before - modelMessages.length} empty message(s)`,
        );
      }

      const result = streamText({
        model: getModel(selectedModelId),
        system: isAnthropicModel ? cleanedSystemPrompt : undefined,
        messages: isAnthropicModel
          ? modelMessages
          : [
              { role: "system" as const, content: cleanedSystemPrompt },
              ...modelMessages,
            ],
        providerOptions: isAnthropicModel
          ? buildAnthropicProviderOptions(selectedModelId)
          : {},
        tools: createTools({
          workspaceId: input.workspaceId,
          userId: input.userId,
          chatId: input.chatId,
          agentType: chat.agentType,
          mode: input.mode ?? "agent",
          loopState,
        }),
        //maxOutputTokens: modelLimits.output,
        maxOutputTokens: 32000,
        temperature: isAnthropicModel ? undefined : 0.5,
        abortSignal: signal,
        onAbort: async () => {
          await updateAiMessage(assistantMessage.id, {
            content: content || "Response was stopped.",
            status: "complete",
            toolCalls,
            toolResults,
          });
          await updateAiChatStatus(chat.id, "stopped");
          void updateWorkflowExecutionByChatId(
            chat.id,
            "cancelled",
            content || null,
          );
        },
        stopWhen: stepCountIs(500),
        onError: ({ error }) => {
          if (isContextWindowError(error)) {
            isContextError = true;
            console.log(
              "[chat.service] Context window error detected via onError",
            );
          }
          if (isModelCompatibilityError(error)) {
            console.log(
              "[chat.service] Model compatibility error detected via onError",
            );
          }
          console.error(
            "[chat.service] AI stream error:",
            (error as any)?.message,
          );
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

        if (part.type === "reasoning-start") {
          // Thinking phase began — reset accumulated reasoning
          reasoningText = "";
          continue;
        }

        if (part.type === "reasoning-delta") {
          reasoningText += part.text;
          await updateAiMessage(assistantMessage.id, {
            reasoning: reasoningText,
          });
          continue;
        }

        if (part.type === "reasoning-end") {
          // Finalize reasoning when the model finishes its thinking phase
          await updateAiMessage(assistantMessage.id, {
            reasoning: reasoningText,
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
            typeof rawOutput === "string"
              ? rawOutput
              : JSON.stringify(rawOutput),
          );

          toolResults = [
            ...toolResults.filter(
              (resultItem) => resultItem.toolCallId !== part.toolCallId,
            ),
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
            ...toolResults.filter(
              (resultItem) => resultItem.toolCallId !== part.toolCallId,
            ),
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

      console.log(
        `[chat.service] Stream ended: isContextError=${isContextError}, contentLen=${content.length}, attempt=${attempt}/${MAX_ATTEMPTS}`,
      );

      // If a context error was detected (via onError or error part), compact and retry
      if (isContextError && attempt < MAX_ATTEMPTS) {
        console.log(
          "[chat.service] Context window exceeded, compacting and retrying...",
        );
        try {
          const { summary, archivedCount } = await compactChat(
            chat.id,
            systemPrompt,
            chat.model,
          );
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
          content:
            "The conversation exceeded the model's context limit and compaction was not sufficient. Please start a new chat.",
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
        reasoning: reasoningText || null,
        toolCalls,
        toolResults,
      });

      await updateAiChatStatus(chat.id, "completed");
      void updateWorkflowExecutionByChatId(
        chat.id,
        "completed",
        content || null,
      );

      break; // Exit retry loop on success
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const isContextLengthError =
        isContextError || isContextWindowError(error);

      if (isContextLengthError && attempt < MAX_ATTEMPTS && !content) {
        try {
          const { summary, archivedCount } = await compactChat(
            chat.id,
            systemPrompt,
            chat.model,
          );
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

      const rawErrorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected AI error occurred.";

      const errorMessage = isModelCompatibilityError(error)
        ? "There is an issue with the selected model. Please pick another one."
        : rawErrorMessage;

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

      void updateWorkflowExecutionByChatId(chat.id, "failed", errorMessage);

      throw error;
    }
  }
}
