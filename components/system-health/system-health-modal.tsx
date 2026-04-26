"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSystemHealth } from "./system-health-context";

export function SystemHealthModal() {
  const { isHealthy, lastError } = useSystemHealth();
  const [mounted, setMounted] = React.useState(false);
  const isOpen = isHealthy === false;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop – no onClick, user cannot dismiss this */}
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="System Unreachable"
        >
          {/* Header */}
          <div className="flex items-center justify-center border-b border-[var(--border)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                System Unreachable
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-[var(--muted)]">
              The code execution environment is currently down.
              The application will automatically resume once it recovers.
            </p>
            {lastError && (
              <p className="mt-2 text-xs text-red-500 font-mono">
                {lastError}
              </p>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Retrying every 5 seconds...</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
