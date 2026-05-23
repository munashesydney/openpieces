"use client";

import { startTransition, useState } from "react";
import { toggleFeatureFlagAction } from "./actions";
import { Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FlagItem {
  key: string;
  description: string;
  enabled: boolean;
}

export function FeatureFlagsClient({
  flags: initialFlags,
}: {
  flags: FlagItem[];
}) {
  const [flags, setFlags] = useState(initialFlags);

  const handleToggle = (key: string) => {
    const current = flags.find((f) => f.key === key);
    if (!current) return;
    const next = !current.enabled;
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: next } : f)),
    );
    startTransition(async () => {
      await toggleFeatureFlagAction(key, next);
    });
  };

  return (
    <div className="flex w-full px-6 pb-20 pt-8">
      <div className="w-full max-w-[820px] px-4 space-y-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
            Features
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Feature Flags
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Enable or disable experimental features. Changes take effect
            immediately.
          </p>
        </div>

        <div className="space-y-3">
          {flags.map((flag) => (
            <Card key={flag.key}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--hover-bg)] text-[var(--muted)]">
                      <Flag size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold capitalize">
                        {flag.key}
                      </h3>
                      <p className="mt-0.5 text-[13px] text-[var(--muted)]">
                        {flag.description}
                      </p>
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={flag.enabled}
                    onClick={() => handleToggle(flag.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
                      flag.enabled
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--border)]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                        flag.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
