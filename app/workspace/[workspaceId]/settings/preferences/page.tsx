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
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  if (!mounted) {
    return (
      <div className="flex w-full justify-center px-6 pb-20 pt-10">
        <div className="w-full max-w-[820px] space-y-8">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Appearance</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Customize how the application looks for you.</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {themes.map((t) => (
                <div key={t.id} className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
                  <t.icon className="h-6 w-6 text-[var(--muted)]" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Appearance</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Customize how the application looks for you.</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition-all ${
                  theme === t.id
                    ? "border-[var(--accent)] bg-[var(--hover-bg)] text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                <t.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}