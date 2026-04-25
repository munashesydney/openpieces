"use client";

import { Check, Loader2, Wrench, XCircle } from "lucide-react";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { getActionLabel } from "@/lib/tools/action-labels";
import { QuestionInputCard } from "./question-input-card";

type ChatToolCallsProps = {
  toolCalls: AiToolCall[];
  toolResults: AiToolResult[];
  /** When there is no assistant text above (tools only), skip the top rule spacing. */
  standalone?: boolean;
  onQuestionSubmit?: (answers: Record<string, string>) => void;
  /** When true, question cards are hidden (user already answered via a follow-up message) */
  isFollowedByUserMessage?: boolean;
  /** When true, ask_question tool calls are skipped (rendered elsewhere, e.g. after content) */
  skipQuestions?: boolean;
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
      icon: XCircle,
      cardClass:
        "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400",
      iconClass: "text-red-500",
    };
  }

  if (state === "success") {
    return {
      icon: Check,
      cardClass:
        "border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--hover-bg)]",
      iconClass: "text-[var(--muted)]",
    };
  }

  return {
    icon: Loader2,
    cardClass:
      "border-[var(--border)] bg-[var(--sidebar-bg)] shadow-sm text-[var(--foreground)]",
    iconClass: "text-[var(--muted)] animate-spin",
  };
}

export function ChatToolCalls({
  toolCalls,
  toolResults,
  standalone = false,
  onQuestionSubmit,
  isFollowedByUserMessage = false,
  skipQuestions = false,
}: ChatToolCallsProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 focus:outline-none w-full">
      {toolCalls.map((toolCall) => {
        const result = toolResults.find(
          (toolResult) => toolResult.toolCallId === toolCall.toolCallId,
        );
        const toolState = getToolExecutionState(result);
        const stateMeta = getToolStateMeta(toolState);
        const StateIcon = stateMeta.icon;
        const action = (toolCall.input as { action?: string })?.action ?? "";

        // Detect ask_question action - skip if user already answered or rendering elsewhere
        if (
          action === "ask_question" &&
          !isFollowedByUserMessage &&
          !skipQuestions
        ) {
          const questions =
            (
              toolCall.input as {
                questions?: Array<{
                  question: string;
                  suggestedAnswers?: string[];
                }>;
              }
            ).questions ?? [];
          return (
            <div key={toolCall.toolCallId} className="w-full mt-1 mb-1">
              <QuestionInputCard
                toolCallId={toolCall.toolCallId}
                questions={questions}
                isPending={toolState === "running"}
                onSubmit={onQuestionSubmit ?? (() => {})}
              />
            </div>
          );
        }

        return (
          <div
            key={toolCall.toolCallId}
            className={`flex w-fit max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors ${stateMeta.cardClass}`}
          >
            <StateIcon
              className={`h-3.5 w-3.5 shrink-0 ${stateMeta.iconClass}`}
            />
            <span className="truncate font-medium">
              {getActionLabel(toolCall.toolName, action)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
