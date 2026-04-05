"use client";

import { CheckCircle2, Loader2, Wrench, XCircle } from "lucide-react";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { getActionLabel } from "@/lib/tools/action-labels";

type ChatToolCallsProps = {
  toolCalls: AiToolCall[];
  toolResults: AiToolResult[];
};

type ToolExecutionState = "running" | "success" | "failed";

function getToolExecutionState(result?: AiToolResult): ToolExecutionState {
  if (!result) return "running";
  if (result.error) return "failed";
  return "success";
}

function getToolStateMeta(state: ToolExecutionState) {
  if (state === "failed") {
    return {
      label: "Failed",
      icon: XCircle,
      badgeClass:
        "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
      cardClass: "border-red-500/20 bg-red-500/5",
      iconClass: "text-red-500",
    };
  }

  if (state === "success") {
    return {
      label: "Success",
      icon: CheckCircle2,
      badgeClass:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      cardClass: "border-emerald-500/20 bg-emerald-500/5",
      iconClass: "text-emerald-500",
    };
  }

  return {
    label: "Running",
    icon: Loader2,
    badgeClass:
      "border-[var(--border)] bg-[var(--sidebar-bg)] text-[var(--muted)]",
    cardClass: "border-[var(--border)] bg-[var(--sidebar-bg)]",
    iconClass: "text-[var(--muted)]",
  };
}

export function ChatToolCalls({ toolCalls, toolResults }: ChatToolCallsProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
      {toolCalls.map((toolCall) => {
        const result = toolResults.find(
          (toolResult) => toolResult.toolCallId === toolCall.toolCallId
        );
        const toolState = getToolExecutionState(result);
        const stateMeta = getToolStateMeta(toolState);
        const StateIcon = stateMeta.icon;

        return (
          <div
            key={toolCall.toolCallId}
            className={`rounded-xl border px-3 py-2.5 text-xs ${stateMeta.cardClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-1.5">
                  <Wrench className="h-3.5 w-3.5 text-[var(--muted)]" />
                </div>
                <p className="truncate text-sm font-medium text-[var(--foreground)]">
                  {getActionLabel(
                  toolCall.toolName,
                  (toolCall.input as { action?: string })?.action ?? ""
                )}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${stateMeta.badgeClass}`}
              >
                <StateIcon
                  className={`h-3.5 w-3.5 ${stateMeta.iconClass} ${toolState === "running" ? "animate-spin" : ""}`}
                />
                {stateMeta.label}
              </span>
            </div>
            {toolState === "failed" && result?.error ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">{result.error}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
