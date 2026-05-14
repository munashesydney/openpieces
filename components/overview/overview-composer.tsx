"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Plus, Send, Square, Minimize2 } from "lucide-react";
import { ContextProgressRing } from "./context-progress-ring";
import { ModelPicker } from "./model-picker";
import { ModeToggle, type ComposerMode } from "./mode-toggle";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import type { ContextInfo } from "./overview-chat-area";

type OverviewComposerProps = {
  onSend?: (value: string) => void;
  onStop?: () => void;
  onCompact?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  isRunning?: boolean;
  isCompacting?: boolean;
  contextInfo?: ContextInfo | null;
  model?: string | null;
  onModelChange?: (model: string) => void;
  mode?: ComposerMode;
  onModeChange?: (mode: ComposerMode) => void;
};

export function OverviewComposer({
  onSend,
  onStop,
  onCompact,
  disabled = false,
  isSending = false,
  isRunning = false,
  isCompacting = false,
  contextInfo,
  model,
  onModelChange,
  mode: externalMode,
  onModeChange,
}: OverviewComposerProps) {
  const [internalMode, setInternalMode] = useState<ComposerMode>("agent");
  const mode = externalMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canCompact =
    contextInfo && contextInfo.percentage >= 50 && onCompact && !isCompacting;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || !onSend || disabled || isSending) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to shrink if text is deleted
      textareaRef.current.style.height = "auto";
      // Set to scrollHeight but capped at 300px
      const newHeight = Math.min(textareaRef.current.scrollHeight, 300);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <div className="flex w-full justify-center px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
      <div className="relative w-full max-w-[820px] min-w-0">
        <Card className="rounded border border-[var(--border)] shadow-[0_18px_60px_rgba(0,0,0,0.2)] transition-all duration-300">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <div className="grid grid-cols-[40px_1fr] items-center gap-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--muted)]"
                aria-label="Add"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <div className="min-w-0">
                <ModeToggle mode={mode} onChange={setMode} />
              </div>

              <div className="col-span-2 mt-4 min-w-0 px-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled || isSending}
                  placeholder={
                    mode === "agent"
                      ? "What shall we automate today?"
                      : "Ask me anything!"
                  }
                  className="w-full resize-none overflow-y-auto bg-transparent py-1 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none scrollbar-hide sm:text-lg"
                  style={{ minHeight: "32px" }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 gap-y-3 px-3 pb-3 sm:gap-3 sm:px-4 sm:pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button variant="secondary" size="icon" aria-label="Attach">
                <Paperclip className="h-4 w-4" />
              </Button>

              {contextInfo ? (
                <ContextProgressRing
                  info={contextInfo}
                  onClick={canCompact ? onCompact : undefined}
                  disabled={isCompacting}
                />
              ) : null}

              <ModelPicker
                initialModel={model ?? undefined}
                onModelChange={onModelChange}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isRunning ? (
                <Button size="icon" aria-label="Stop" onClick={onStop}>
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  aria-label="Send"
                  onClick={handleSend}
                  isLoading={isSending}
                  disabled={disabled}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Dynamic background gradient based on mode */}
        <div
          className={`pointer-events-none absolute -inset-x-16 -top-14 h-[420px] transition-opacity duration-1000 ${
            mode === "agent" ? "opacity-50" : "opacity-0"
          } bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15)_0%,rgba(6,182,212,0.05)_40%,transparent_65%)]`}
        />
      </div>
    </div>
  );
}
