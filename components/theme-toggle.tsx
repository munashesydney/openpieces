"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="rounded-lg p-2 text-[var(--muted)]"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" strokeWidth={2} stroke="currentColor" fill="none" />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={2} stroke="currentColor" fill="none" />
      )}
    </button>
  );
}
