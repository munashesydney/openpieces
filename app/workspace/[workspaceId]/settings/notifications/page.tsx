"use client";

import { Bell, Mail, Smartphone } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Email Notifications</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Choose which emails you'd like to receive.</p>
          
          <div className="mt-8 space-y-4">
            {[
              "Product Updates",
              "Security Alerts",
              "Team Announcements",
              "New Comments",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]" defaultChecked />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Push Notifications</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Configure how you receive alerts on your devices.</p>
          
          <div className="mt-8">
            <button className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)]">
              Manage Device Tokens
            </button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white shadow-[0_10px_25px_var(--accent-glow)] transition-opacity hover:opacity-90">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
