"use client";

import { Shield, Key, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";

export default function SecurityPage() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Authentication</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage how you secure your account access.</p>
          
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                <p className="text-xs text-[var(--muted)]">Add an extra layer of security to your account.</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="text-sm font-medium">Session Management</h3>
                <p className="text-xs text-[var(--muted)]">View and manage your active sessions across devices.</p>
              </div>
              <Button variant="outline" size="sm">
                View Sessions
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Access Logs</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Recent activity on your workspace account.</p>
          
          <div className="mt-8">
            <div className="rounded-lg bg-[var(--background)] p-4 text-center text-xs text-[var(--muted)] border border-[var(--border)]">
              No recent security activity found.
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button>
            Update Security
          </Button>
        </div>
      </div>
    </div>
  );
}
