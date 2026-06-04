"use client";

import { useEffect, useRef, useState } from "react";
import {
  getItem,
  setItem,
  removeItem,
} from "@/lib/services/local-storage.service";

type SleepCardProps = {
  seconds: number;
  reason?: string;
  isPending: boolean;
  toolCallId: string;
};

const STORAGE_PREFIX = "sleep_timer";

function storageKey(toolCallId: string): string {
  return `${STORAGE_PREFIX}:${toolCallId}`;
}

type SleepTimerData = { startedAt: number };

export function SleepCard({
  seconds,
  reason,
  isPending,
  toolCallId,
}: SleepCardProps) {
  const startTimeRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(() => {
    if (!isPending) return 0;
    const stored = getItem<SleepTimerData>(storageKey(toolCallId));
    if (stored !== null) {
      const elapsed = (Date.now() - stored.startedAt) / 1000;
      return Math.max(0, seconds - elapsed);
    }
    return seconds;
  });

  useEffect(() => {
    if (!isPending) {
      removeItem(storageKey(toolCallId));
      return;
    }

    if (startTimeRef.current === null) {
      const stored = getItem<SleepTimerData>(storageKey(toolCallId));
      if (stored !== null) {
        startTimeRef.current = stored.startedAt;
      } else {
        startTimeRef.current = Date.now();
        setItem(storageKey(toolCallId), { startedAt: startTimeRef.current });
      }
    }

    const update = () => {
      const elapsed = (Date.now() - startTimeRef.current!) / 1000;
      setRemaining(Math.max(0, seconds - elapsed));
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [seconds, isPending, toolCallId]);

  const progress = !isPending
    ? 1
    : seconds > 0
      ? Math.max(0, Math.min(1, (seconds - remaining) / seconds))
      : 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-[var(--foreground)]">
          {reason || (isPending ? "Sleeping..." : "Sleep complete")}
        </div>
        <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
          {Math.max(0, Math.ceil(remaining))}s / {seconds}s
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-200 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
