"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useOpenCodeStream } from "@/lib/hooks/use-opencode-stream";
import { ChatToolCalls } from "./chat-tool-calls";
import { MarkdownRenderer } from "./markdown-renderer";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";

type SpawnOpenCodeCardProps = {
  input: {
    sessionId?: string;
    content?: string;
  };
  result?: {
    sessionId?: string;
    message?: string;
  } | null;
  isPending: boolean;
};

function mapToolsToOverview(
  tools: { name: string; title?: string; status: string }[],
): { calls: AiToolCall[]; results: AiToolResult[] } {
  const calls: AiToolCall[] = [];
  const results: AiToolResult[] = [];
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const callId = `oc-${i}`;
    calls.push({
      toolCallId: callId,
      toolName: t.name,
      input: { title: t.title },
      status:
        t.status === "completed"
          ? "success"
          : t.status === "error"
            ? "error"
            : "running",
    } as AiToolCall);
    results.push({
      toolCallId: callId,
      output: t.title || t.name,
    } as AiToolResult);
  }
  return { calls, results };
}

function assistantLabel(content?: string): string {
  if (content) {
    const preview = content.slice(0, 60).replace(/\n/g, " ");
    return preview.length < content.length ? `${preview}…` : preview;
  }
  return "OpenCode Agent";
}

export function SpawnOpenCodeCard({
  input,
  result,
  isPending,
}: SpawnOpenCodeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sessionId = result?.sessionId ?? input.sessionId ?? null;

  const { messages, sessionStatus } = useOpenCodeStream(sessionId);

  const isPendingSpawn = isPending && !sessionId;
  const isRunning = sessionStatus === "busy";
  const isCompleted = sessionStatus === "idle";
  const isFailed = sessionStatus === "error";

  const statusLabel = isPendingSpawn
    ? "Spawning…"
    : !sessionStatus
      ? "Loading…"
      : isRunning
        ? `Running — ${messages.length} message${messages.length === 1 ? "" : "s"}`
        : isCompleted
          ? `Completed — ${messages.length} message${messages.length === 1 ? "" : "s"}`
          : isFailed
            ? "Failed"
            : sessionStatus;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover-bg)]"
      >
        <Wrench className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--foreground)] truncate">
            {assistantLabel(input.content)}
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
            <span className="text-xs text-[var(--muted)]">{statusLabel}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border)] max-h-[420px] overflow-y-auto divide-y divide-[var(--border)]">
          {messages.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[var(--muted)]">
              {isPendingSpawn ? "Waiting for session…" : "No messages yet"}
            </p>
          ) : (
            messages.map((msg, i) => {
              const { calls, results } = mapToolsToOverview(msg._tools);
              const isLast = i === messages.length - 1;
              const isMsgStreaming = !!msg._streaming && isLast;

              return (
                <div key={i} className="px-4 py-3">
                  {/* Role label */}
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] mb-1.5">
                    {msg.role === "user" ? "You" : "OpenCode"}
                  </div>

                  {/* Tool chips + reasoning (always visible, compact) */}
                  {(calls.length > 0 || msg._reasoning) && (
                    <div className="mb-2">
                      {msg._reasoning && (
                        <details className="text-xs text-[var(--muted)]">
                          <summary className="cursor-pointer hover:text-[var(--foreground)] transition-colors select-none">
                            {isMsgStreaming ? "Thinking…" : "Thought"}
                          </summary>
                          <div className="mt-1 pl-2 border-l-2 border-[var(--border)] whitespace-pre-wrap leading-relaxed">
                            {msg._reasoning}
                          </div>
                        </details>
                      )}
                      {calls.length > 0 && (
                        <ChatToolCalls
                          toolCalls={calls}
                          toolResults={results}
                          variant="compact"
                        />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  {msg.content.trim() ? (
                    <div className="text-[13px] leading-relaxed text-[var(--foreground)] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-[var(--hover-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_pre]:rounded [&_pre]:bg-[var(--hover-bg)] [&_pre]:p-2 [&_pre]:text-[12px] [&_pre]:overflow-x-auto [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5">
                      <MarkdownRenderer content={msg.content} />
                      {isMsgStreaming && (
                        <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--accent)] animate-pulse align-middle" />
                      )}
                    </div>
                  ) : isMsgStreaming ? (
                    <span className="inline-block w-2 h-4 bg-[var(--accent)] animate-pulse align-middle" />
                  ) : (
                    <p className="text-xs text-[var(--muted)] italic">
                      {msg.role === "assistant" ? "Working…" : "Empty"}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
