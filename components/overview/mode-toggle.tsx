"use client";

import { Sparkles, MessageSquare } from "lucide-react";

export type ComposerMode = "agent" | "chat";

interface ModeToggleProps {
  mode: ComposerMode;
  onChange: (mode: ComposerMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const isAgent = mode === "agent";

  return (
    <button
      type="button"
      onClick={() => onChange(isAgent ? "chat" : "agent")}
      className={`group relative inline-flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-[13px] font-medium transition-all hover:border-[var(--accent)]/20 hover:bg-[var(--hover-bg)] active:scale-[0.98] shadow-sm`}
    >
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 ${
          isAgent
            ? "bg-[var(--accent)] text-white rotate-0 shadow-[0_0_10px_var(--accent-glow)]"
            : "bg-[var(--hover-bg-strong)] text-[var(--muted)] rotate-[-12deg]"
        }`}
      >
        {isAgent ? (
          <Sparkles className="h-3 w-3" />
        ) : (
          <MessageSquare className="h-3 w-3" />
        )}
      </div>
      <span
        className={`transition-colors duration-200 ${
          isAgent ? "text-[var(--foreground)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
        }`}
      >
        {isAgent ? "Agent Mode" : "Chat Mode"}
      </span>
    </button>
  );
}
