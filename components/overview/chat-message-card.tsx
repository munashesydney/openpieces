"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { ChatToolCalls } from "./chat-tool-calls";
import { QuestionInputCard } from "./question-input-card";
import { MarkdownRenderer } from "./markdown-renderer";

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
  "text-[15px] leading-[1.65] text-[var(--foreground)] break-words [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-[var(--accent)] [&_a]:underline [&_code]:rounded [&_code]:bg-[var(--hover-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[var(--border)] [&_pre]:bg-[var(--sidebar-bg)] [&_pre]:p-3";

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
        <p className="text-[15px] leading-relaxed text-[var(--foreground)] whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    );
  }

  const hasBody = content.trim().length > 0;
  const hasReasoning = !!reasoning && reasoning.trim().length > 0;
  const isStreamingReasoning = isStreaming && !hasBody;

  // Separate question tool calls (rendered after content) from other tool calls
  const questionToolCalls = toolCalls.filter(
    (tc) => (tc.input as { action?: string })?.action === "ask_question",
  );
  const nonQuestionToolCalls = toolCalls.filter(
    (tc) => (tc.input as { action?: string })?.action !== "ask_question",
  );

  // ── Thinking section visibility ──
  // Debounce the hide to prevent flicker when streaming ends before
  // reasoning text / tool call data arrives in the next render tick.
  const [showThinking, setShowThinking] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (isStreaming || hasReasoning || nonQuestionToolCalls.length > 0) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setShowThinking(true);
    } else if (!isStreaming) {
      // Small grace period for reasoning/tool data to catch up
      hideTimerRef.current = setTimeout(() => setShowThinking(false), 80);
      return () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
  }, [isStreaming, hasReasoning, nonQuestionToolCalls.length]);

  const showThinkingSection = showThinking;

  // Auto-collapse once streaming finishes
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (
      !isStreaming &&
      (hasReasoning || nonQuestionToolCalls.length > 0) &&
      !autoCollapsed
    ) {
      setAutoCollapsed(true);
      setExpanded(false);
    }
  }, [isStreaming, hasReasoning, nonQuestionToolCalls.length, autoCollapsed]);

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
              {nonQuestionToolCalls.length > 0 ? (
                <ChatToolCalls
                  toolCalls={nonQuestionToolCalls}
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

      {/* Render question cards after content (bottom of message) when there is body text */}
      {(hasBody || hasReasoning) &&
        !isFollowedByUserMessage &&
        questionToolCalls.map((tc) => {
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
