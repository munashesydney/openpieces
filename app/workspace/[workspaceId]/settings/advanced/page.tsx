"use client";

import { Globe, Zap, Database, Hammer } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";

export default function AdvancedPage() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">API Configuration</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage your API keys and developer settings.</p>
          
          <div className="mt-8 space-y-4">
            <div className="relative">
              <Input
                label="Primary API Key"
                type="password"
                readOnly
                defaultValue="sk_test_51Mz..."
              />
              <div className="absolute bottom-[5px] right-2">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-[var(--accent)]">
                  Reveal
                </Button>
              </div>
            </div>
            <Button variant="ghost" className="text-[var(--accent)] p-0 h-auto hover:bg-transparent hover:underline">
              Generate New Key
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Data Management</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Export your data or clear regional caches.</p>
          
          <div className="mt-8 flex gap-3 flex-wrap">
            <Button variant="outline">
              Export All Data
            </Button>
            <Button variant="danger">
              Purge Cache
            </Button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button>
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
