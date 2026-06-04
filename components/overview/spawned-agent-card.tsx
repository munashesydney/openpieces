"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { ChatToolCalls } from "./chat-tool-calls";
import { MarkdownRenderer } from "./markdown-renderer";
import type { ChatMessage } from "./overview-chat-area";

type SpawnedAgentCardProps = {
  input: {
    agentType?: string;
    prompt?: string;
    chatId?: string;
  };
  /** The tool result output — undefined while the tool is still pending. */
  result?: {
    chatId?: string;
    status?: string;
  } | null;
  isPending: boolean;
};

function agentLabel(type: string | undefined): string {
  switch (type) {
    case "architecture":
      return "Architecture Agent";
    case "orchestrator":
      return "Orchestrator Agent";
    default:
      return "Spawned Agent";
  }
}

function callerLabel(type: string | undefined): string {
  switch (type) {
    case "architecture":
      return "Orchestrator";
    case "orchestrator":
      return "Events";
    default:
      return "Spawner";
  }
}

function statusLabel(
  status: string | null | undefined,
  messageCount: number,
): string {
  if (!status) return "Spawning...";
  if (status === "pending" || status === "processing")
    return `Running — ${messageCount} message${messageCount === 1 ? "" : "s"} so far`;
  if (status === "completed")
    return `Completed — ${messageCount} message${messageCount === 1 ? "" : "s"}`;
  if (status === "failed") return "Failed";
  if (status === "stopped") return "Stopped";
  return status;
}

function MessageRow({
  msg,
  agentType,
}: {
  msg: ChatMessage;
  agentType?: string;
}) {
  const [showThinking, setShowThinking] = useState(false);
  const hasReasoning = !!msg.reasoning && msg.reasoning.trim().length > 0;
  const hasToolCalls = msg.toolCalls.length > 0;
  const isAssistant = msg.role === "assistant";
  const hasThinking = isAssistant && (hasReasoning || hasToolCalls);

  const title = isAssistant
    ? agentType
      ? agentLabel(agentType)
      : "Assistant"
    : callerLabel(agentType);

  return (
    <div className="px-4 py-3">
      {/* Title row */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] mb-1.5">
        {title}
      </div>

      {/* Thinking section (reasoning + tool calls) for assistant messages */}
      {hasThinking && (
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setShowThinking((v) => !v)}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            {showThinking ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {hasReasoning ? "Thought" : "Tool calls"}
          </button>

          {showThinking && (
            <div className="mt-1.5 border-l-2 border-[var(--border)] pl-3 space-y-1.5">
              {hasReasoning && (
                <p className="text-[13px] leading-[1.6] text-[var(--muted)] whitespace-pre-wrap break-words">
                  {msg.reasoning}
                </p>
              )}
              {hasToolCalls && (
                <ChatToolCalls
                  toolCalls={msg.toolCalls}
                  toolResults={msg.toolResults}
                  variant="compact"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Message content as markdown */}
      {msg.content.trim() ? (
        <div className="text-[13px] leading-relaxed text-[var(--foreground)] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-[var(--hover-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_pre]:rounded [&_pre]:bg-[var(--hover-bg)] [&_pre]:p-2 [&_pre]:text-[12px] [&_pre]:overflow-x-auto [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5">
          <MarkdownRenderer content={msg.content} />
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)] italic">
          {isAssistant ? "Thinking..." : "Empty"}
        </p>
      )}
    </div>
  );
}

export function SpawnedAgentCard({
  input,
  result,
  isPending,
}: SpawnedAgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const spawnedChatId = result?.chatId ?? input.chatId ?? null;

  const {
    messages: spawnedMessages,
    status: spawnedStatus,
    isLoading: spawnedLoading,
  } = useChatStream(spawnedChatId);

  const hasChatId = !!spawnedChatId;
  const effectiveStatus = spawnedStatus ?? result?.status ?? null;
  const displayStatus = hasChatId ? effectiveStatus : null;
  const displayMessages = hasChatId ? spawnedMessages : [];
  const isPendingSpawn = isPending && !hasChatId;

  const label = statusLabel(displayStatus, displayMessages.length);

  const isRunning =
    displayStatus === "pending" || displayStatus === "processing";
  const isCompleted = displayStatus === "completed";
  const isFailed = displayStatus === "failed";

  // Auto-scroll to bottom while running, unless user scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      userScrolledUpRef.current = !atBottom;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [expanded]);

  useEffect(() => {
    if (!expanded || userScrolledUpRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [expanded, displayMessages]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
      {/* ── Header (always visible, clickable) ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover-bg)]"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--foreground)]">
            {input.agentType ? agentLabel(input.agentType) : "Spawned Agent"}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isPendingSpawn ? (
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]/50 animate-spin" />
            ) : isRunning ? (
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
            ) : isCompleted ? (
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            ) : isFailed ? (
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            ) : null}
            <span className="text-xs text-[var(--muted)]">{label}</span>
          </div>
        </div>

        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        )}
      </button>

      {/* ── Dropdown content ── */}
      {expanded && (
        <div
          className="border-t border-[var(--border)] max-h-[420px] overflow-y-auto"
          ref={scrollRef}
        >
          {displayMessages.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[var(--muted)]">
              {spawnedLoading ? "Loading messages..." : "No messages yet"}
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {displayMessages.map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  agentType={input.agentType}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
