"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";

interface ChatLimitBannerProps {
  isOverLimit: boolean;
  used: number;
  limit: number;
  onReset: () => Promise<void>;
}

export function ChatLimitBanner({
  isOverLimit,
  used,
  limit,
  onReset,
}: ChatLimitBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOverLimit || dismissed) return null;

  const handleReset = () => {
    startTransition(async () => {
      await onReset();
    });
  };

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] border-l-[3px] border-l-[#d97706] bg-[var(--sidebar-bg)] px-6 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-[#d97706]" />
      <div className="min-w-0 flex-1 text-sm text-[var(--foreground)]">
        <span className="font-semibold">Chat limit reached</span>
        {" — "}
        {used}/{limit} chats used today.
        {isPending ? " Resetting\u2026" : " Reset the counter to continue."}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent)]/80"
          onClick={handleReset}
          disabled={isPending}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
