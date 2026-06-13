"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  PanelLeftOpen,
  PanelLeftClose,
  Settings,
  Brain,
  Building2,
  Code2,
} from "lucide-react";
import { WorkspaceSwitcher } from "./workspace-switcher";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // New: /org/[orgId]/workspace/[workspaceId]/...
  // segments[0]='org', [1]=orgId, [2]='workspace', [3]=workspaceId
  const isOrgRoute = segments[0] === "org";
  const orgId = isOrgRoute ? segments[1] : null;
  const workspaceId =
    isOrgRoute && segments[2] === "workspace" ? segments[3] : null;

  const personalHref =
    orgId && workspaceId
      ? `/org/${orgId}/workspace/${workspaceId}/personal`
      : "/org";
  const personalActive = pathname.startsWith(personalHref);

  const brainHref =
    orgId && workspaceId
      ? `/org/${orgId}/workspace/${workspaceId}/brain`
      : "/brain";
  const brainActive =
    orgId && workspaceId
      ? pathname.startsWith(`/org/${orgId}/workspace/${workspaceId}/brain`)
      : false;

  const settingsHref =
    orgId && workspaceId
      ? `/org/${orgId}/workspace/${workspaceId}/settings/general`
      : "/settings";
  const settingsActive =
    orgId && workspaceId
      ? pathname.includes(`/org/${orgId}/workspace/${workspaceId}/settings`)
      : pathname.startsWith("/settings");

  const developersHref =
    orgId && workspaceId
      ? `/org/${orgId}/workspace/${workspaceId}/developers/api`
      : "/developers";
  const developersActive =
    orgId && workspaceId
      ? pathname.includes(`/org/${orgId}/workspace/${workspaceId}/developers`)
      : pathname.startsWith("/developers");

  if (collapsed) {
    return (
      <aside className="relative z-20 flex h-full w-14 shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
        {/* Top expand */}
        <button
          type="button"
          onClick={onToggle}
          className="mt-3 flex h-9 w-9 items-center justify-center rounded border border-transparent text-[var(--muted)] transition-all hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          aria-label="Show sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        {/* Brand logo */}
        <img
          src="/op-not-moving.png"
          alt="OpenPieces"
          width={28}
          height={28}
          className="mt-3 h-7 w-7 rounded object-cover"
        />

        {/* Navigation icons */}
        <div className="mt-5 flex-1 space-y-1">
          <Link
            href={personalHref}
            className={`flex h-9 w-9 items-center justify-center rounded border transition-all ${
              personalActive
                ? "border-[var(--accent)]/30 bg-[var(--hover-bg-strong)] text-[var(--foreground)] shadow-[0_0_12px_var(--accent-glow)]"
                : "border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
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
            href={brainHref}
            className={`flex h-9 w-9 items-center justify-center rounded border transition-all ${
              brainActive
                ? "border-[var(--accent)]/30 bg-[var(--hover-bg-strong)] text-[var(--foreground)] shadow-[0_0_12px_var(--accent-glow)]"
                : "border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Brain"
          >
            <Brain
              className="h-4 w-4"
              strokeWidth={brainActive ? 2.5 : 1.5}
              fill="none"
            />
          </Link>
          <Link
            href={settingsHref}
            className={`flex h-9 w-9 items-center justify-center rounded border transition-all ${
              settingsActive
                ? "border-[var(--accent)]/30 bg-[var(--hover-bg-strong)] text-[var(--foreground)] shadow-[0_0_12px_var(--accent-glow)]"
                : "border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Settings"
          >
            <Settings
              className="h-4 w-4"
              strokeWidth={settingsActive ? 2.5 : 1.5}
              fill="none"
            />
          </Link>
          <Link
            href={developersHref}
            className={`flex h-9 w-9 items-center justify-center rounded border transition-all ${
              developersActive
                ? "border-[var(--accent)]/30 bg-[var(--hover-bg-strong)] text-[var(--foreground)] shadow-[0_0_12px_var(--accent-glow)]"
                : "border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Developers"
          >
            <Code2
              className="h-4 w-4"
              strokeWidth={developersActive ? 2.5 : 1.5}
              fill="none"
            />
          </Link>
        </div>

        {/* Workspace switcher */}
        <div className="w-full border-t border-[var(--border)] py-3">
          <WorkspaceSwitcher
            placement="up"
            variant="icon"
            activeWorkspaceId={workspaceId ?? undefined}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative z-20 flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
      {/* Logo + collapse button */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/op-not-moving.png"
            alt="OpenPieces"
            width={28}
            height={28}
            className="h-7 w-7 rounded object-cover"
          />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            openpieces
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-[var(--muted)] transition-all hover:border-[var(--border)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          aria-label="Hide sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <section className="flex-1 overflow-auto px-3">
        <ul className="space-y-1">
          <li>
            <Link
              href={personalHref}
              className={`flex items-center gap-2.5 rounded px-3 py-2.5 text-[13px] font-medium transition-all ${
                personalActive
                  ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <User
                className="h-4 w-4 shrink-0"
                strokeWidth={personalActive ? 2.5 : 1.5}
                fill="none"
              />
              Personal
              {personalActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--secondary)] shadow-[0_0_6px_var(--secondary-glow)]" />
              )}
            </Link>
          </li>
          <li>
            <Link
              href={brainHref}
              className={`flex items-center gap-2.5 rounded px-3 py-2.5 text-[13px] font-medium transition-all ${
                brainActive
                  ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <Brain
                className="h-4 w-4 shrink-0"
                strokeWidth={brainActive ? 2.5 : 1.5}
                fill="none"
              />
              Brain
              {brainActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--secondary)] shadow-[0_0_6px_var(--secondary-glow)]" />
              )}
            </Link>
          </li>
          <li>
            <Link
              href={settingsHref}
              className={`flex items-center gap-2.5 rounded px-3 py-2.5 text-[13px] font-medium transition-all ${
                settingsActive
                  ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <Settings
                className="h-4 w-4 shrink-0"
                strokeWidth={settingsActive ? 2.5 : 1.5}
                fill="none"
              />
              Settings
              {settingsActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--secondary)] shadow-[0_0_6px_var(--secondary-glow)]" />
              )}
            </Link>
          </li>
          <li>
            <Link
              href={developersHref}
              className={`flex items-center gap-2.5 rounded px-3 py-2.5 text-[13px] font-medium transition-all ${
                developersActive
                  ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <Code2
                className="h-4 w-4 shrink-0"
                strokeWidth={developersActive ? 2.5 : 1.5}
                fill="none"
              />
              Developers
              {developersActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--secondary)] shadow-[0_0_6px_var(--secondary-glow)]" />
              )}
            </Link>
          </li>
        </ul>
      </section>

      {/* Bottom workspace switcher (drop-up) */}

      <div className="border-b border-[var(--border)] py-3">
        <WorkspaceSwitcher
          placement="up"
          activeWorkspaceId={workspaceId ?? undefined}
        />
      </div>
      <Link
        href="/org"
        className="flex items-center justify-center gap-1 px-4 py-4 text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] transition-colors"
      >
        <Building2 className="h-4 w-4 shrink-0" />
        Manage organizations
      </Link>
    </aside>
  );
}
