"use client";

import { Moon, Sun, Monitor, Languages } from "lucide-react";

export default function PreferencesPage() {
  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Appearance</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Customize how the application looks for you.</p>
          
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "System", icon: Monitor },
            ].map((theme) => (
              <button
                key={theme.id}
                className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 transition-all hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
              >
                <theme.icon className="h-6 w-6 text-[var(--muted)]" />
                <span className="text-sm font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Language & Region</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Set your preferred language and time format.</p>
          
          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Interface Language</label>
              <select className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all">
                <option>English (United States)</option>
                <option>Spanish (Spain)</option>
                <option>French (France)</option>
                <option>German (Germany)</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white shadow-[0_10px_25px_var(--accent-glow)] transition-opacity hover:opacity-90">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
