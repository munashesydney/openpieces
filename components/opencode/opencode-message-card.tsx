"use client";

import { MarkdownRenderer } from "@/components/overview/markdown-renderer";

export type ToolChip = { name: string; title?: string; status: string };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  _tools: ToolChip[];
  _reasoning: string | null;
  _msgId?: string;
  _streaming?: boolean;
};

function ToolChipBadge({ chip }: { chip: ToolChip }) {
  const isCompleted = chip.status === "completed";
  const isRunning = chip.status === "running";
  const isError = chip.status === "error";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0 ${
        isCompleted
          ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
          : isRunning
            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 animate-pulse"
            : isError
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : "bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20"
      }`}
      title={chip.title ?? chip.name}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
        {chip.name}
      </span>
      {chip.title && (
        <span className="truncate max-w-[160px]">{chip.title}</span>
      )}
    </span>
  );
}

export function OpenCodeMessageCard({
  message,
  isSending,
  isLast,
}: {
  message: ChatMessage;
  isSending: boolean;
  isLast: boolean;
}) {
  const isUser = message.role === "user";
  const isStreaming = !!message._streaming;
  const showCursor = isStreaming && isSending && isLast;
  const hasContent = message.content.length > 0;
  const reasoningOpen = !isStreaming && !hasContent;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-xl overflow-hidden ${
          isUser
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)]"
        }`}
      >
        {/* Tool chips row */}
        {message._tools.length > 0 && (
          <div className="flex flex-wrap gap-1 px-4 pt-3 pb-1">
            {message._tools
              .filter((chip) => isStreaming || chip.status === "completed")
              .map((chip, i) => (
                <ToolChipBadge key={i} chip={chip} />
              ))}
          </div>
        )}

        {/* Reasoning (collapsible) */}
        {message._reasoning && (
          <details
            open={reasoningOpen}
            className="px-4 pt-2 pb-1 text-xs text-[var(--muted)] cursor-pointer group"
          >
            <summary className="hover:text-[var(--foreground)] transition-colors select-none">
              {isStreaming ? "Thinking…" : "Thought"}
            </summary>
            <div className="mt-1.5 pl-2 border-l-2 border-[var(--border)] text-[var(--muted)] whitespace-pre-wrap leading-relaxed">
              {message._reasoning}
            </div>
          </details>
        )}

        {/* Content body */}
        <div className="px-4 py-3">
          {isUser ? (
            <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.6]">
              {message.content}
            </div>
          ) : message.content ? (
            <div className="text-[15px] leading-[1.6]">
              <MarkdownRenderer content={message.content} />
              {showCursor && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--accent)] animate-pulse align-middle" />
              )}
            </div>
          ) : showCursor ? (
            <span className="inline-block w-2 h-4 bg-[var(--accent)] animate-pulse align-middle" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
