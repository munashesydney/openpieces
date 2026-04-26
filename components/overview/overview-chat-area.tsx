"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChatMessageCard } from "./chat-message-card";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";

export type ChatMessage = {
  id: string;
  content: string;
  reasoning: string | null;
  role: "user" | "assistant";
  status: "pending" | "streaming" | "complete" | "error" | "compacted";
  toolCalls: AiToolCall[];
  toolResults: AiToolResult[];
};

export type ContextInfo = {
  usedTokens: number;
  maxTokens: number;
  percentage: number;
  status: "ok" | "warning" | "critical";
  needsCompaction: boolean;
};

type OverviewChatAreaProps = {
  messages: ChatMessage[];
  status?: string | null;
  error?: string | null;
  /** When the backend job is still running (pending / processing). */
  isChatRunning?: boolean;
  /** Initial / refetch load for the thread message list. */
  isLoadingMessages?: boolean;
  onQuestionSubmit?: (answers: Record<string, string>) => void;
};

function ChatMessagesLoadingSkeleton() {
  return (
    <div
      className="flex flex-col gap-7 max-w-[820px] mx-auto w-full animate-pulse"
      aria-busy={true}
      aria-label="Loading messages"
    >
      <div className="flex justify-end">
        <div className="h-11 w-[min(52%,280px)] rounded-[1.35rem] bg-[var(--hover-bg)]" />
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="h-3.5 w-full max-w-[92%] rounded-md bg-[var(--hover-bg)]" />
        <div className="h-3.5 w-full max-w-[88%] rounded-md bg-[var(--hover-bg)]" />
        <div className="h-3.5 w-full max-w-[64%] rounded-md bg-[var(--hover-bg)]" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-[min(44%,240px)] rounded-[1.35rem] bg-[var(--hover-bg)]" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-full max-w-[80%] rounded-md bg-[var(--hover-bg)]" />
        <div className="h-3.5 w-full max-w-[55%] rounded-md bg-[var(--hover-bg)]" />
      </div>
    </div>
  );
}

export function OverviewChatArea({
  messages,
  status,
  error,
  isChatRunning = false,
  isLoadingMessages = false,
  onQuestionSubmit,
}: OverviewChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Show all messages — including in-flight placeholders (the thinking
   *  block inside ChatMessageCard replaces the old separate indicator). */
  const visibleMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Hide compacted user messages (the summary is model-only context)
      if (msg.status === "compacted" && msg.role === "user") return false;
      return true;
    });
  }, [messages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (messages.length === 0 && !isLoadingMessages) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoadingMessages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto px-4 py-6 sm:px-8"
      >
        {isLoadingMessages && visibleMessages.length === 0 ? (
          <ChatMessagesLoadingSkeleton />
        ) : visibleMessages.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-12">
            No messages yet
          </p>
        ) : (
          <div className="flex flex-col gap-7 max-w-[820px] mx-auto w-full">
            {visibleMessages.map((msg, index) => {
              const nextMsg = visibleMessages[index + 1];
              const isFollowedByUserMessage =
                msg.role === "assistant" && nextMsg?.role === "user";

              const isStreaming =
                msg.role === "assistant" &&
                (msg.status === "pending" || msg.status === "streaming");

              return (
                <div
                  key={msg.id}
                  className={`flex w-full animate-[messageIn_0.3s_ease-out_both] ${
                    msg.status === "compacted"
                      ? "justify-center"
                      : msg.role === "user"
                        ? "justify-end"
                        : "justify-start"
                  }`}
                >
                  {msg.status === "compacted" ? (
                    <div className="flex items-center gap-3 py-2 w-full max-w-[600px]">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <span className="text-xs text-[var(--muted)] flex items-center gap-1.5 whitespace-nowrap">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          opacity="0.5"
                        >
                          <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9Z" />
                        </svg>
                        {msg.content}
                      </span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                  ) : (
                    <ChatMessageCard
                      content={msg.content}
                      reasoning={msg.reasoning}
                      role={msg.role}
                      toolCalls={msg.toolCalls}
                      toolResults={msg.toolResults}
                      isStreaming={isStreaming}
                      onQuestionSubmit={onQuestionSubmit}
                      isFollowedByUserMessage={isFollowedByUserMessage}
                    />
                  )}
                </div>
              );
            })}
            {status === "failed" && error ? (
              <div className="flex w-full max-w-[680px] items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3.5 py-2.5">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM7 5v3a1 1 0 0 0 2 0V5a1 1 0 1 0-2 0Zm1 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
                <p className="text-sm text-red-500/90 leading-relaxed">
                  {error}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
