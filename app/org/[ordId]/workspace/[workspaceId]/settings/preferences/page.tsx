"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themes = [
    { id: "light", label: "Light", icon: Sun, desc: "Clean, bright interface" },
    { id: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
    { id: "system", label: "System", icon: Monitor, desc: "Follow OS setting" },
  ];

  if (!mounted) {
    return (
      <div className="flex w-full px-6 pb-20 pt-8">
        <div className="w-full px-4 space-y-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">Display</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Preferences</h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Customize how the application looks for you.</p>
          </div>
          <section className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Appearance</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Choose your preferred theme.</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {themes.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col items-center gap-2.5 rounded border border-[var(--border)] bg-[var(--background)] p-5"
                >
                  <t.icon className="h-5 w-5 text-[var(--muted)]" />
                  <span className="text-[13px] font-medium">{t.label}</span>
                  <span className="text-[11px] text-[var(--muted)]">{t.desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full px-6 pb-20 pt-8">
      <div className="w-full px-4 space-y-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">Display</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Preferences</h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">Customize how the application looks for you.</p>
        </div>

        <section className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Appearance</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">Choose your preferred theme.</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-2.5 rounded border p-5 transition-colors ${
                  theme === t.id
                    ? "border-[var(--accent)] bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--muted)]/20 hover:bg-[var(--hover-bg)]"
                }`}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-[13px] font-medium">{t.label}</span>
                <span className="text-[11px] text-[var(--muted)]">{t.desc}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
