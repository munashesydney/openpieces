"use client";

import { Bell, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";

export default function NotificationsPage() {
  return (
    <div className="flex w-full px-6 pb-20">
      <div className="w-full px-4 space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            Email Notifications
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose which emails you'd like to receive.
          </p>

          <div className="mt-8 space-y-4">
            {[
              "Product Updates",
              "Security Alerts",
              "Team Announcements",
              "New Comments",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                  defaultChecked
                />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            Push Notifications
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Configure how you receive alerts on your devices.
          </p>

          <div className="mt-8">
            <Button variant="outline">Manage Device Tokens</Button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
