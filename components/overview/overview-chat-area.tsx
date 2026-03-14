"use client";

import { useEffect, useRef } from "react";
import { ChatMessageCard } from "./chat-message-card";

export type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
};

type OverviewChatAreaProps = {
  messages: ChatMessage[];
};

export function OverviewChatArea({ messages }: OverviewChatAreaProps) {
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
              <ChatMessageCard content={msg.content} role={msg.role} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
