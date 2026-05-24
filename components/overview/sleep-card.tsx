"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

type SleepCardProps = {
  seconds: number;
  reason?: string;
  isPending: boolean;
};

export function SleepCard({ seconds, reason, isPending }: SleepCardProps) {
  const startTimeRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!isPending) {
      setRemaining(0);
      return;
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    const update = () => {
      const elapsed = (Date.now() - startTimeRef.current!) / 1000;
      setRemaining(Math.max(0, seconds - elapsed));
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [seconds, isPending]);

  const progress =
    seconds > 0
      ? Math.max(0, Math.min(1, (seconds - remaining) / seconds))
      : 1;
  const display =
    remaining >= 1
      ? `${Math.ceil(remaining)}s`
      : remaining > 0
        ? `${remaining.toFixed(1)}s`
        : "0s";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-md border border-[var(--border)] bg-[var(--hover-bg)] p-1.5">
          <Timer className="h-3.5 w-3.5 text-[var(--muted)]" />
        </div>
        <span className="text-sm font-medium text-[var(--foreground)]">
          {isPending ? `Sleeping — ${display} remaining` : "Sleep complete"}
        </span>
        {isPending && (
          <span className="ml-auto text-xs text-[var(--muted)] font-mono tabular-nums">
            {display}
          </span>
        )}
      </div>
      {reason && (
        <p className="text-sm text-[var(--muted)] mb-2">{reason}</p>
      )}
      <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-200 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
