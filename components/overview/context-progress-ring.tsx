"use client";

import type { ContextInfo } from "./overview-chat-area";

const STATUS_ARC = {
  ok: "stroke-[var(--foreground)]",
  warning: "stroke-yellow-400",
  critical: "stroke-red-400",
} as const;

type ContextProgressRingProps = {
  info: ContextInfo;
  className?: string;
};

/**
 * Thin circular track with a glowing arc for context usage (next to model picker).
 */
export function ContextProgressRing({ info, className = "" }: ContextProgressRingProps) {
  const size = 22;
  const stroke = 2.25;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, info.percentage));
  const dash = (pct / 100) * circumference;

  const label = `Context ${Math.round(pct)}% used (${info.usedTokens.toLocaleString()} / ${info.maxTokens.toLocaleString()} tokens)`;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      title={label}
      role="img"
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block rotate-[-90deg]"
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-[var(--muted)]/25"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={`transition-[stroke-dashoffset,stroke] duration-300 ${STATUS_ARC[info.status]}`}
          style={{
            strokeDasharray: `${dash} ${circumference}`,
            filter:
              info.status === "critical"
                ? "drop-shadow(0 0 3px rgba(248, 113, 113, 0.45))"
                : info.status === "warning"
                  ? "drop-shadow(0 0 3px rgba(250, 204, 21, 0.35))"
                  : "drop-shadow(0 0 2px rgba(255, 255, 255, 0.35))",
          }}
        />
      </svg>
    </div>
  );
}
