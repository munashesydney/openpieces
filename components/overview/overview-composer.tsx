"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Paperclip, Plus, Send, Waves } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { ModeToggle, type ComposerMode } from "./mode-toggle";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";

type OverviewComposerProps = {
  onSend?: (value: string) => void;
};

export function OverviewComposer({ onSend }: OverviewComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("agent");
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || !onSend) return;
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
    <div className="flex w-full justify-center px-6 pb-14 pt-14">
      <div className="relative w-full max-w-[820px]">
        <Card className="rounded-[28px] shadow-[0_18px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_18_60px_rgba(0,0,0,0.35)] transition-all duration-300">
          <div className="px-4 py-4">
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
                  placeholder={
                    mode === "agent"
                      ? "What shall we automate today?"
                      : "Ask me anything!"
                  }
                  className="w-full resize-none overflow-y-auto bg-transparent py-1 text-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none scrollbar-hide"
                  style={{ minHeight: "32px" }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <ModelPicker />

              <Button
                variant="secondary"
                size="icon"
                aria-label="Browse"
              >
                <Globe className="h-4 w-4" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                aria-label="More"
              >
                <span className="block text-lg leading-none pt-1">…</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Voice"
              >
                <Waves className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                aria-label="Send"
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Dynamic background gradient based on mode */}
        <div
          className={`pointer-events-none absolute -inset-x-16 -top-14 h-[420px] transition-opacity duration-1000 ${mode === "agent" ? "opacity-60" : "opacity-0"
            } bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.18)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.2)_0%,transparent_55%)]`}
        />
      </div>
    </div>
  );
}



