"use client";

import { Globe, Paperclip, Plus, Send, Waves } from "lucide-react";
import { ModelPicker } from "./model-picker";

export function OverviewComposer() {
  return (
    <div className="flex w-full justify-center px-6 pb-14 pt-14">
      <div className="relative w-full max-w-[820px]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[0_18px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="px-4 py-4">
            <div className="grid grid-cols-[40px_1fr] items-center gap-x-3">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--hover-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                aria-label="Add"
              >
                <Plus className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--hover-bg-strong)]"
                  aria-label="Context"
                >
                  <span className="h-5 w-5 rounded-full bg-[var(--hover-bg-strong)]" />
                  <span className="truncate">Agent Mode</span>
                </button>
              </div>

              <div className="col-span-2 mt-2 min-w-0">
                <textarea
                  rows={1}
                  placeholder="Get a detailed report..."
                  className="w-full resize-none bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--hover-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                aria-label="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <ModelPicker />

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--hover-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                aria-label="Browse"
              >
                <Globe className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--hover-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                aria-label="More"
              >
                <span className="block text-lg leading-none">…</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--hover-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                aria-label="Voice"
              >
                <Waves className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_10px_25px_var(--accent-glow)] transition-opacity hover:opacity-90"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -inset-x-16 -top-14 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.18)_0%,transparent_55%)] opacity-60 dark:bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.2)_0%,transparent_55%)]" />
      </div>
    </div>
  );
}

