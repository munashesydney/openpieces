"use client";

import { useEffect, useState } from "react";
import { CHAT_THINKING_STATUSES, CHAT_THINKING_TOOL_STATUSES } from "./chat-thinking-statuses";

type ChatThinkingIndicatorProps = {
  /** Use tool-oriented status copy while function calls are active. */
  toolPhase?: boolean;
};

/** Inline row (no card): spinner + cycling status. Mount only while visible. */
export function ChatThinkingIndicator({ toolPhase = false }: ChatThinkingIndicatorProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const list = toolPhase ? CHAT_THINKING_TOOL_STATUSES : CHAT_THINKING_STATUSES;
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % list.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [toolPhase]);

  const statuses = toolPhase ? CHAT_THINKING_TOOL_STATUSES : CHAT_THINKING_STATUSES;

  return (
    <div
      className="flex w-full max-w-[min(100%,680px)] items-center gap-2.5 py-1 animate-[messageIn_0.35s_ease-out_both]"
      role="status"
      aria-live="polite"
      aria-label={toolPhase ? "Assistant is using tools" : "Assistant is thinking"}
    >
      <span
        className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-[var(--muted)]/30 border-t-[var(--foreground)] animate-spin opacity-90"
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-sm text-[var(--muted)]">
        <span className="text-[var(--foreground)]">{toolPhase ? "Working" : "Thinking"}</span>
        <span className="mx-1.5 text-[var(--muted)]">·</span>
        <span key={statusIndex} className="inline-block animate-[thinkingLabel_0.45s_ease-out_both]">
          {statuses[statusIndex]}
        </span>
      </p>
    </div>
  );
}
