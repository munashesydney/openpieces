"use client";

import { Globe, Zap, Database, Hammer } from "lucide-react";

export default function AdvancedPage() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">API Configuration</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage your API keys and developer settings.</p>
          
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary API Key</label>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
                <input
                  type="password"
                  readOnly
                  value="sk_test_51Mz..."
                  className="flex-1 px-3 py-1.5 text-sm bg-transparent focus:outline-none"
                />
                <button className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:underline">
                  Reveal
                </button>
              </div>
            </div>
            <button className="text-sm font-medium text-[var(--accent)] hover:underline">
              Generate New Key
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Data Management</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Export your data or clear regional caches.</p>
          
          <div className="mt-8 flex gap-3 flex-wrap">
            <button className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] transition-colors">
              Export All Data
            </button>
            <button className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] transition-colors text-amber-500 border-amber-500/20">
              Purge Cache
            </button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white shadow-[0_10px_25px_var(--accent-glow)] transition-opacity hover:opacity-90">
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
