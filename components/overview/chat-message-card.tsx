"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { ChatToolCalls } from "./chat-tool-calls";
import { QuestionInputCard } from "./question-input-card";

type ChatMessageCardProps = {
  content: string;
  role?: "user" | "assistant";
  reasoning?: string | null;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  onQuestionSubmit?: (answers: Record<string, string>) => void;
  isFollowedByUserMessage?: boolean;
};

const assistantMarkdownClass =
  "text-[15px] leading-[1.65] text-[var(--foreground)] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-[var(--accent)] [&_a]:underline [&_code]:rounded [&_code]:bg-[var(--hover-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[var(--border)] [&_pre]:bg-[var(--sidebar-bg)] [&_pre]:p-3";

export function ChatMessageCard({
  content,
  role = "user",
  reasoning,
  toolCalls = [],
  toolResults = [],
  onQuestionSubmit,
  isFollowedByUserMessage,
}: ChatMessageCardProps) {
  if (role === "user") {
    return (
      <div
        className="max-w-[min(85%,520px)] rounded-[1.35rem] border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-2.5 shadow-sm"
        data-role="user"
      >
        <p className="text-[15px] leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
          {content}
        </p>
      </div>
    );
  }

  const hasBody = content.trim().length > 0;
  const hasReasoning = !!reasoning && reasoning.trim().length > 0;
  const isStreamingReasoning = hasReasoning && !hasBody;

  // Separate question tool calls so they render after content instead of with other tool calls
  const questionToolCalls = toolCalls.filter(
    (tc) => (tc.input as { action?: string })?.action === "ask_question",
  );

  return (
    <div
      className="w-full max-w-[min(100%,680px)] min-w-0"
      data-role="assistant"
    >
      <ChatToolCalls
        toolCalls={toolCalls}
        toolResults={toolResults}
        standalone={!hasBody && !hasReasoning}
        onQuestionSubmit={onQuestionSubmit}
        isFollowedByUserMessage={isFollowedByUserMessage}
        skipQuestions={hasBody || hasReasoning}
      />

      {hasReasoning ? (
        <div className="mb-3">
          {/* Thinking label when still streaming reasoning */}
          {isStreamingReasoning ? (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/70 animate-pulse" />
              <span className="text-xs font-medium text-[var(--muted)]">
                Thinking
              </span>
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:0ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
              </span>
            </div>
          ) : null}
          {/* Reasoning text rendered inline, styled simply */}
          <div className="border-l-2 border-amber-500/30 pl-3 py-0.5">
            <p className="text-[13px] leading-[1.6] text-[var(--muted)] whitespace-pre-wrap">
              {reasoning}
            </p>
          </div>
        </div>
      ) : null}

      {hasBody ? (
        <div
          className={`${assistantMarkdownClass}${toolCalls.length > 0 || hasReasoning ? " mt-3" : ""}`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
