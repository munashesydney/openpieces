"use client";

import { Card } from "../ui/card";

type ChatMessageCardProps = {
  content: string;
  role?: "user" | "assistant";
};

export function ChatMessageCard({ content, role = "user" }: ChatMessageCardProps) {
  return (
    <Card
      className={`rounded-2xl border border-[var(--border)] px-4 py-3 ${
        role === "user"
          ? "ml-auto max-w-[85%] bg-[var(--sidebar-bg)]"
          : "mr-auto max-w-[85%] bg-[var(--hover-bg)]"
      }`}
    >
      <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{content}</p>
    </Card>
  );
}
