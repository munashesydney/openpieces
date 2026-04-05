"use client";

import { useEffect, useRef } from "react";
import { ChatMessageCard } from "./chat-message-card";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";

export type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  status: "pending" | "streaming" | "complete" | "error";
  toolCalls: AiToolCall[];
  toolResults: AiToolResult[];
};

export type ContextInfo = {
  usedChars: number;
  maxChars: number;
  percentage: number;
  status: "ok" | "warning" | "critical";
  needsCompaction: boolean;
};

type OverviewChatAreaProps = {
  messages: ChatMessage[];
  status?: string | null;
  error?: string | null;
  contextInfo?: ContextInfo | null;
  onCompact?: () => void;
};

const STATUS_COLORS = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
};

const STATUS_TEXT_COLORS = {
  ok: "text-green-600",
  warning: "text-yellow-600",
  critical: "text-red-600",
};

export function OverviewChatArea({ messages, status, error, contextInfo, onCompact }: OverviewChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  const contextBar = contextInfo ? (
    <div className="flex items-center gap-3 px-2 py-2 border-b border-[var(--border)]">
      <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${STATUS_COLORS[contextInfo.status]}`}
          style={{ width: `${contextInfo.percentage}%` }}
        />
      </div>
      <div className={`text-xs font-medium ${STATUS_TEXT_COLORS[contextInfo.status]}`}>
        {Math.round(contextInfo.percentage)}%
      </div>
      {contextInfo.status === "critical" && onCompact && (
        <button
          onClick={onCompact}
          className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          title="Compact context to continue"
        >
          Compact
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {contextBar}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto px-6 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">
            Messages will appear here
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-w-[820px] mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="animate-[messageIn_0.3s_ease-out_both]"
              >
                <ChatMessageCard
                  content={msg.content}
                  role={msg.role}
                  status={msg.status}
                  toolCalls={msg.toolCalls}
                  toolResults={msg.toolResults}
                />
              </div>
            ))}
            {status === "failed" && error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
