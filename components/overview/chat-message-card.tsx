"use client";

import { Card } from "../ui/card";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";

type ChatMessageCardProps = {
  content: string;
  role?: "user" | "assistant";
  status?: "pending" | "streaming" | "complete" | "error";
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
};

function summarizeToolOutput(value: unknown) {
  if (value == null) {
    return "No output";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    const text = JSON.stringify(value);
    return text.length <= 160 ? text : `${text.slice(0, 157)}...`;
  } catch {
    return "Structured output";
  }
}

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
      <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{content}</p>
      {role === "assistant" && toolCalls.length > 0 ? (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          {toolCalls.map((toolCall) => {
            const result = toolResults.find(
              (toolResult) => toolResult.toolCallId === toolCall.toolCallId
            );

            return (
              <div
                key={toolCall.toolCallId}
                className="rounded-xl bg-[var(--sidebar-bg)] px-3 py-2 text-xs text-[var(--muted)]"
              >
                <p className="font-medium text-[var(--foreground)]">{toolCall.toolName}</p>
                <p className="mt-1">
                  {result?.error
                    ? `Error: ${result.error}`
                    : summarizeToolOutput(result?.output ?? "Running...")}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
      {role === "assistant" && status === "streaming" && !content ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Thinking...</p>
      ) : null}
    </Card>
  );
}
