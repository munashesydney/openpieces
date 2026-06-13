"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { ChatToolCalls } from "./chat-tool-calls";
import { QuestionInputCard } from "./question-input-card";
import { SleepCard } from "./sleep-card";
import { SpawnedAgentCard } from "./spawned-agent-card";
import { SpawnOpenCodeCard } from "./spawn-opencode-card";
import { MarkdownRenderer } from "./markdown-renderer";

type SpawnResult = { chatId?: string; status?: string } | undefined;

/** Tool outputs are JSON-stringified by the storage layer. Parse if needed. */
function parseToolOutput(raw: unknown): SpawnResult {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as SpawnResult;
    } catch {
      return undefined;
    }
  }
  return raw as SpawnResult;
}

type ChatMessageCardProps = {
  content: string;
  role?: "user" | "assistant";
  reasoning?: string | null;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  /** Whether the model is still streaming this message. */
  isStreaming?: boolean;
  onQuestionSubmit?: (answers: Record<string, string>) => void;
  isFollowedByUserMessage?: boolean;
};

const assistantMarkdownClass =
  "text-[15px] leading-[1.65] text-[var(--foreground)] break-words [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-[var(--accent)] [&_a]:underline [&_code]:rounded [&_code]:bg-[var(--hover-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]";

export function ChatMessageCard({
  content,
  role = "user",
  reasoning,
  toolCalls = [],
  toolResults = [],
  isStreaming = false,
  onQuestionSubmit,
  isFollowedByUserMessage,
}: ChatMessageCardProps) {
  if (role === "user") {
    return (
      <div
        className="max-w-[min(85%,520px)] rounded-[1.35rem] border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-2.5 shadow-sm"
        data-role="user"
      >
        {content && (
          <p className="text-[15px] leading-relaxed text-[var(--foreground)] whitespace-pre-wrap break-words">
            {content}
          </p>
        )}
      </div>
    );
  }

  const hasBody = content.trim().length > 0;
  const hasReasoning = !!reasoning && reasoning.trim().length > 0;
  const isStreamingReasoning = isStreaming && !hasBody;

  // Separate tool calls by action for dedicated rendering
  const questionToolCalls = toolCalls.filter(
    (tc) => (tc.input as { action?: string })?.action === "ask_question",
  );
  const sleepToolCalls = toolCalls.filter(
    (tc) => (tc.input as { action?: string })?.action === "sleep",
  );
  const spawnToolCalls = toolCalls.filter(
    (tc) => (tc.input as { action?: string })?.action === "spawn_agent",
  );
  const opencodeToolCalls = toolCalls.filter(
    (tc) =>
      tc.toolName === "manage_opencode_messages" &&
      (tc.input as { action?: string })?.action === "send",
  );
  const otherToolCalls = toolCalls.filter((tc) => {
    const action = (tc.input as { action?: string })?.action;
    return (
      action !== "ask_question" &&
      action !== "sleep" &&
      action !== "spawn_agent" &&
      tc.toolName !== "manage_opencode_messages"
    );
  });

  // ── Thinking section visibility ──
  // Debounce the hide to prevent flicker when streaming ends before
  // reasoning text / tool call data arrives in the next render tick.
  const [showThinking, setShowThinking] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (isStreaming || hasReasoning || otherToolCalls.length > 0) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setShowThinking(true);
    } else if (!isStreaming) {
      // Small grace period for reasoning/tool data to catch up
      hideTimerRef.current = setTimeout(() => setShowThinking(false), 80);
      return () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
  }, [isStreaming, hasReasoning, otherToolCalls.length]);

  const showThinkingSection = showThinking;

  // Auto-collapse once streaming finishes
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (
      !isStreaming &&
      (hasReasoning || otherToolCalls.length > 0) &&
      !autoCollapsed
    ) {
      setAutoCollapsed(true);
      setExpanded(false);
    }
  }, [isStreaming, hasReasoning, otherToolCalls.length, autoCollapsed]);

  // Determine section label
  let sectionLabel: string;
  if (isStreaming) {
    sectionLabel = "Thinking";
  } else if (hasReasoning) {
    sectionLabel = "Thought";
  } else {
    sectionLabel = "Process";
  }

  return (
    <div
      className="w-full max-w-[min(100%,680px)] min-w-0"
      data-role="assistant"
    >
      {/* Thinking / thought process section — includes reasoning and tool calls */}
      {showThinkingSection && (
        <div className="mb-3">
          {/* Header row: entire row is clickable, chevron sits right next to the label */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 mb-1.5 rounded px-0.5 -ml-0.5 transition-colors hover:bg-[var(--hover-bg)]"
            aria-label={expanded ? "Collapse reasoning" : "Expand reasoning"}
          >
            {isStreaming ? (
              <>
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]/50" />
                <span className="text-xs font-medium text-[var(--muted)] shrink-0 tracking-wide">
                  {sectionLabel}
                </span>
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 animate-[thinkingDot_1.4s_ease-in-out_infinite] rounded-full bg-[var(--muted)]" />
                  <span className="h-1 w-1 animate-[thinkingDot_1.4s_ease-in-out_infinite] rounded-full bg-[var(--muted)] [animation-delay:0.2s]" />
                  <span className="h-1 w-1 animate-[thinkingDot_1.4s_ease-in-out_infinite] rounded-full bg-[var(--muted)] [animation-delay:0.4s]" />
                </span>
                {/* Chevron right next to label */}
                {expanded ? (
                  <ChevronDown className="h-3 w-3 text-[var(--muted)]" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
                )}
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]/50" />
                <span className="text-xs font-medium text-[var(--muted)]">
                  {sectionLabel}
                </span>
                {/* Chevron right next to the text */}
                {expanded ? (
                  <ChevronDown className="h-3 w-3 text-[var(--muted)]" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
                )}
              </>
            )}
          </button>

          {/* Expandable content — amber left border area */}
          {expanded ? (
            <div className="border-l-2 border-[var(--border)] pl-3 py-0.5 space-y-1.5">
              {/* Reasoning text or waiting spinner */}
              {hasReasoning ? (
                <p className="text-[13px] leading-[1.6] text-[var(--muted)] whitespace-pre-wrap break-words">
                  {reasoning}
                </p>
              ) : isStreaming ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]/50 animate-spin" />
                  <span className="text-xs text-[var(--muted)]">
                    Waiting for model response…
                  </span>
                </div>
              ) : null}

              {/* Tool calls rendered compactly inside the thought process */}
              {otherToolCalls.length > 0 ? (
                <ChatToolCalls
                  toolCalls={otherToolCalls}
                  toolResults={toolResults}
                  variant="compact"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {hasBody ? (
        <div
          className={`${assistantMarkdownClass}${toolCalls.length > 0 || hasReasoning || isStreaming ? " mt-3" : ""}`}
        >
          <MarkdownRenderer content={content} />
        </div>
      ) : null}

      {/* Render sleep card while streaming — hides once the response is complete */}
      {isStreaming &&
        sleepToolCalls.map((tc) => {
          const result = toolResults.find(
            (r) => r.toolCallId === tc.toolCallId,
          );
          const input = tc.input as { seconds?: number; reason?: string };
          return (
            <div key={tc.toolCallId} className="w-full mt-3">
              <SleepCard
                toolCallId={tc.toolCallId}
                seconds={input.seconds ?? 0}
                reason={input.reason}
                isPending={!result}
              />
            </div>
          );
        })}

      {/* Render spawned agent cards — persists even after streaming ends */}
      {spawnToolCalls.map((tc) => {
        const result = toolResults.find((r) => r.toolCallId === tc.toolCallId);
        const input = tc.input as {
          agentType?: string;
          prompt?: string;
          chatId?: string;
        };
        const rawOutput = result?.output;
        const output = parseToolOutput(rawOutput);
        return (
          <div key={tc.toolCallId} className="w-full mt-3">
            <SpawnedAgentCard
              input={input}
              result={output}
              isPending={!result}
            />
          </div>
        );
      })}

      {/* Render OpenCode session cards */}
      {opencodeToolCalls.map((tc) => {
        const result = toolResults.find((r) => r.toolCallId === tc.toolCallId);
        const input = tc.input as {
          sessionId?: string;
          content?: string;
        };
        const rawOutput = result?.output;
        const output = parseToolOutput(rawOutput) as
          | {
              sessionId?: string;
              message?: string;
            }
          | undefined;
        return (
          <div key={tc.toolCallId} className="w-full mt-3">
            <SpawnOpenCodeCard
              input={input}
              result={output ?? null}
              isPending={!result}
            />
          </div>
        );
      })}

      {/* Render question cards after content (bottom of message) when there is body text */}
      {(hasBody || hasReasoning) &&
        !isFollowedByUserMessage &&
        questionToolCalls
          .filter((tc) => {
            // Skip duplicate ask_question calls (the 2nd+ call is blocked server-side)
            const result = toolResults.find(
              (r) => r.toolCallId === tc.toolCallId,
            );
            if (result?.output === "already_asked") {
              return false;
            }
            return true;
          })
          .map((tc) => {
            const result = toolResults.find(
              (r) => r.toolCallId === tc.toolCallId,
            );
            const questions =
              (
                tc.input as {
                  questions?: Array<{
                    question: string;
                    suggestedAnswers?: string[];
                  }>;
                }
              ).questions ?? [];
            return (
              <div key={tc.toolCallId} className="w-full mt-3">
                <QuestionInputCard
                  toolCallId={tc.toolCallId}
                  questions={questions}
                  isPending={!result}
                  onSubmit={onQuestionSubmit ?? (() => {})}
                />
              </div>
            );
          })}
    </div>
  );
}
