"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AiToolCall, AiToolResult } from "@/lib/ai-chat/types";
import { ChatToolCalls } from "./chat-tool-calls";

type ChatMessageCardProps = {
  content: string;
  role?: "user" | "assistant";
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  onQuestionSubmit?: (answers: Record<string, string>) => void;
  isFollowedByUserMessage?: boolean;
};

const assistantMarkdownClass =
  "text-[15px] leading-[1.65] text-[var(--foreground)] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:text-[var(--accent)] [&_a]:underline [&_code]:rounded [&_code]:bg-[var(--hover-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[var(--border)] [&_pre]:bg-[var(--sidebar-bg)] [&_pre]:p-3";

export function ChatMessageCard({
  content,
  role = "user",
  toolCalls = [],
  toolResults = [],
  onQuestionSubmit,
  isFollowedByUserMessage,
}: ChatMessageCardProps) {
  if (role === "user") {
    return (
      <div
        className="max-w-[min(85%,520px)] rounded-[1.35rem] border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-2.5 shadow-sm"
        data-role="user"
      >
        <p className="text-[15px] leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
          {content}
        </p>
      </div>
    );
  }

  const hasBody = content.trim().length > 0;

  return (
    <div className="w-full max-w-[min(100%,680px)] min-w-0" data-role="assistant">
      {hasBody ? (
        <div className={assistantMarkdownClass}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : null}
      <ChatToolCalls
        toolCalls={toolCalls}
        toolResults={toolResults}
        standalone={!hasBody}
        onQuestionSubmit={onQuestionSubmit}
        isFollowedByUserMessage={isFollowedByUserMessage}
      />
    </div>
  );
}
