"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, PanelLeftOpen, PanelLeftClose, Settings } from "lucide-react";
import { WorkspaceSwitcher } from "./workspace-switcher";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const workspaceId = segments[1]; // ['', 'workspace', '{id}', 'personal'] -> ['workspace','{id}','personal']
  const personalHref = workspaceId ? `/workspace/${workspaceId}/personal` : "/";
  const personalActive = pathname.startsWith(personalHref);
  
  const settingsHref = workspaceId ? `/workspace/${workspaceId}/settings/general` : "/settings";
  const settingsActive = workspaceId ? pathname.includes(`/workspace/${workspaceId}/settings`) : pathname.startsWith(settingsHref);

  if (collapsed) {
    return (
      <aside className="flex h-full w-14 shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
        {/* Top expand */}
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          aria-label="Show sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>

        {/* Brand logo */}
        <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-900">
          <span className="text-lg font-bold text-white">O</span>
        </div>

        {/* Navigation icons */}
        <div className="mt-5 flex-1 space-y-2">
          <Link
            href={personalHref}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition-colors ${personalActive
              ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
              : "hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
              }`}
            aria-label="Personal"
          >
            <User
              className="h-4 w-4"
              strokeWidth={personalActive ? 2.5 : 1.5}
              fill="none"
            />
          </Link>
          <Link
            href={settingsHref}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition-colors ${settingsActive
              ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
              : "hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
              }`}
            aria-label="Settings"
          >
            <Settings
              className="h-4 w-4"
              strokeWidth={settingsActive ? 2.5 : 1.5}
              fill="none"
            />
          </Link>
        </div>

        {/* Workspace switcher */}
        <div className="w-full border-t border-[var(--border)] py-3">
          <WorkspaceSwitcher placement="up" variant="icon" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
      {/* Logo + collapse button */}
      <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-900">
            <span className="text-lg font-bold text-white">O</span>
          </div>
          <span className="text-xl font-semibold text-[var(--foreground)]">
            OpenPieces
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          aria-label="Hide sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <section className="flex-1 overflow-auto p-4">
        <ul className="space-y-2">
          <li>
            <Link
              href={personalHref}
              className={`flex items-start gap-2 rounded-lg p-3 transition-colors ${personalActive
                ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                : "bg-[var(--hover-bg)] text-[var(--muted)] hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                }`}
            >
              <User
                className="mt-0.5 h-4 w-4 shrink-0"
                strokeWidth={personalActive ? 2.5 : 1.5}
                fill="none"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Personal</p>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href={settingsHref}
              className={`flex items-start gap-2 rounded-lg p-3 transition-colors ${settingsActive
                ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                : "bg-[var(--hover-bg)] text-[var(--muted)] hover:bg-[var(--hover-bg-strong)] hover:text-[var(--foreground)]"
                }`}
            >
              <Settings
                className="mt-0.5 h-4 w-4 shrink-0"
                strokeWidth={settingsActive ? 2.5 : 1.5}
                fill="none"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Settings</p>
              </div>
            </Link>
          </li>
        </ul>
      </section>

      {/* Bottom workspace switcher (drop-up) */}
      <div className="border-t border-[var(--border)] py-3">
        <WorkspaceSwitcher placement="up" />
      </div>
    </aside>
  );
}
