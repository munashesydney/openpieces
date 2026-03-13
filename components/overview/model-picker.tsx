"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Model = {
  id: string;
  label: string;
  providerMark?: "g" | "spark" | "swirl";
  badge?: string;
};

const MODELS: Model[] = [
  { id: "claude-opus", label: "Claude Opus 4.1", providerMark: "spark" },
  { id: "gemini-pro", label: "Gemini 3 Pro", providerMark: "g", badge: "BETA" },
  { id: "gpt-5-instant", label: "GPT-5 Instant", providerMark: "swirl" },
  { id: "gpt-5-thinking", label: "GPT-5 Thinking", providerMark: "swirl" },
  { id: "gpt-4o", label: "GPT-4o", providerMark: "swirl" },
];

function ProviderMark({ mark }: { mark: Model["providerMark"] }) {
  if (mark === "g") {
    return (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        G
      </div>
    );
  }
  if (mark === "spark") {
    return (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-600 dark:text-orange-400">
        ✳
      </div>
    );
  }
  return (
    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--hover-bg)] text-[10px] font-bold text-[var(--muted)]">
      ◎
    </div>
  );
}

export function ModelPicker() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<Model["id"]>(MODELS[1]!.id);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => MODELS.find((m) => m.id === activeId) ?? MODELS[0]!,
    [activeId],
  );

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--hover-bg-strong)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose model"
      >
        <ProviderMark mark={active.providerMark} />
        <span className="whitespace-nowrap">{active.label}</span>
        {active.badge && (
          <span className="ml-1 rounded-full bg-[var(--hover-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {active.badge}
          </span>
        )}
        <ChevronRight
          className={`ml-1 h-4 w-4 text-[var(--muted)] transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
        >
          <div className="p-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-2 text-sm text-[var(--muted)]">
              Search models...
            </div>
          </div>
          <div className="h-px bg-[var(--border)]" />
          <div className="p-1">
            {MODELS.map((m) => {
              const selected = m.id === activeId;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveId(m.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--hover-bg)]"
                >
                  <ProviderMark mark={m.providerMark} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {m.label}
                      </p>
                      {m.badge && (
                        <span className="rounded-full bg-[var(--hover-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                          {m.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  {selected ? (
                    <Check className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

