"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Model = {
  id: string;
  label: string;
  badge?: string;
};

type Provider = {
  id: string;
  label: string;
  models: Model[];
};

const PROVIDERS: Provider[] = [
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { id: "gpt-5-early", label: "GPT-5 Early Access", badge: "NEW" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus", label: "Claude 3 Opus" },
      { id: "claude-3-haiku", label: "Claude 3 Haiku" },
    ],
  },
  {
    id: "google",
    label: "Google",
    models: [
      { id: "gemini-1-5-pro", label: "Gemini 1.5 Pro", badge: "BETA" },
      { id: "gemini-1-5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
];

export function ModelPicker() {
  const [open, setOpen] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string>(PROVIDERS[0]!.models[0]!.id);
  const [hoveredProviderId, setHoveredProviderId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const activeModel = useMemo(() => {
    for (const p of PROVIDERS) {
      const model = p.models.find((m) => m.id === activeModelId);
      if (model) return model;
    }
    return PROVIDERS[0]!.models[0]!;
  }, [activeModelId]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--hover-bg-strong)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="whitespace-nowrap">{activeModel.label}</span>
        {activeModel.badge && (
          <span className="ml-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
            {activeModel.badge}
          </span>
        )}
        <ChevronRight
          className={`ml-1 h-3.5 w-3.5 text-[var(--muted)] transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div 
          className="absolute left-0 top-[calc(100%+12px)] z-[100] flex"
          onMouseLeave={() => setHoveredProviderId(null)}
        >
          {/* Providers List */}
          <div className="w-[180px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Providers
            </p>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onMouseEnter={() => setHoveredProviderId(p.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all ${
                  hoveredProviderId === p.id 
                    ? "bg-[var(--hover-bg)] text-[var(--foreground)]" 
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {p.label}
                <ChevronRight className="h-3 w-3 opacity-50" />
              </button>
            ))}
          </div>

          {/* Models Submenu (Cascading) */}
          {hoveredProviderId && (
            <div className="ml-2 w-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-left-2 duration-200">
               <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Models
              </p>
              {PROVIDERS.find(p => p.id === hoveredProviderId)?.models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveModelId(m.id);
                    setOpen(false);
                    setHoveredProviderId(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all ${
                    activeModelId === m.id
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate">{m.label}</span>
                    {m.badge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        activeModelId === m.id ? "bg-white/20 text-white" : "bg-[var(--hover-bg)] text-[var(--muted)]"
                      }`}>
                        {m.badge}
                      </span>
                    )}
                  </div>
                  {activeModelId === m.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
