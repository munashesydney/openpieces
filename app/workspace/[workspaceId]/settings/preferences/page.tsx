"use client";

import { useState } from "react";
import { Moon, Sun, Monitor, Languages } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Dropdown } from "@/components/basic/input/dropdown";

export default function PreferencesPage() {
  const [language, setLanguage] = useState("en-US");
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
            <Dropdown
              label="Interface Language"
              value={language}
              onChange={setLanguage}
              options={[
                { label: "English (United States)", value: "en-US" },
                { label: "Spanish (Spain)", value: "es-ES" },
                { label: "French (France)", value: "fr-FR" },
                { label: "German (Germany)", value: "de-DE" },
              ]}
            />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
