"use client";

import { Card } from "../ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { ChatToolCalls } from "./chat-tool-calls";

type ChatMessageCardProps = {
  content: string;
  role?: "user" | "assistant";
  status?: "pending" | "streaming" | "complete" | "error";
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
};

export function ChatMessageCard({
  content,
  role = "user",
  status,
  toolCalls = [],
  toolResults = [],
}: ChatMessageCardProps) {
  return (
    <Card
      className={`rounded-2xl border border-[var(--border)] px-4 py-3 ${
        role === "user"
          ? "ml-auto max-w-[85%] bg-[var(--sidebar-bg)]"
          : "mr-auto max-w-[85%] bg-[var(--hover-bg)]"
      }`}
    >
      {role === "assistant" ? (
        <div className="text-sm text-[var(--foreground)] [&_p]:whitespace-pre-wrap">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{content}</p>
      )}
      {role === "assistant" ? (
        <ChatToolCalls toolCalls={toolCalls} toolResults={toolResults} />
      ) : null}
      {role === "assistant" && status === "streaming" && !content ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Thinking...</p>
      ) : null}
    </Card>
  );
}
