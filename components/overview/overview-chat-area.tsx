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

type OverviewChatAreaProps = {
  messages: ChatMessage[];
  status?: string | null;
  error?: string | null;
};

export function OverviewChatArea({ messages, status, error }: OverviewChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  return (
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
  );
}
