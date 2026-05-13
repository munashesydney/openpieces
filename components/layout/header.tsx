"use client";

import {
  LayoutDashboard,
  Workflow,
  Calendar,
  Settings,
  Shield,
  Monitor,
  ExternalLink,
  Bot,
  Menu,
  X,
  Puzzle,
  Terminal,
  KeyRound,
  Brain,
  Activity,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { ProfileDropdown } from "../layout/profile-dropdown";
import { WorkspaceSwitcher } from "../layout/workspace-switcher";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  const workspaceId = segments[1];

  const isSettingsPage = pathname.includes("/settings");
  const isBrainPage = pathname.startsWith(`/workspace/${workspaceId}/brain`);

  const personalHref = workspaceId ? `/workspace/${workspaceId}/personal` : "/";
  const brainHref = workspaceId ? `/workspace/${workspaceId}/brain` : "/brain";
  const settingsHref = workspaceId
    ? `/workspace/${workspaceId}/settings/general`
    : "/settings";

  const personalActive = pathname.startsWith(personalHref);
  const brainActive = pathname.startsWith(`/workspace/${workspaceId}/brain`);
  const settingsActive = workspaceId
    ? pathname.includes(`/workspace/${workspaceId}/settings`)
    : pathname.startsWith(settingsHref);

  const brainNavItems = [
    {
      label: "Brain",
      href: workspaceId ? `/workspace/${workspaceId}/brain` : "/brain",
      icon: Brain,
      activePattern: workspaceId ? `/workspace/${workspaceId}/brain` : "/brain",
    },
    {
      label: "Activity",
      href: workspaceId
        ? `/workspace/${workspaceId}/brain/activity`
        : "/brain/activity",
      icon: Activity,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/brain/activity`
        : "/brain/activity",
    },
  ];

  const personalNavItems = [
    {
      label: "Overview",
      href: workspaceId ? `/workspace/${workspaceId}/personal` : "/",
      icon: LayoutDashboard,
      activePattern: workspaceId ? `/workspace/${workspaceId}/personal` : "/",
    },
    {
      label: "Workflows",
      href: workspaceId
        ? `/workspace/${workspaceId}/personal/workflows`
        : "/workflows",
      icon: Workflow,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/personal/workflows`
        : "/workflows",
    },
    {
      label: "Services",
      href: workspaceId
        ? `/workspace/${workspaceId}/personal/services`
        : "/services",
      icon: Puzzle,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/personal/services`
        : "/services",
    },
    {
      label: "Tasks",
      href: workspaceId ? `/workspace/${workspaceId}/personal/tasks` : "/tasks",
      icon: Calendar,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/personal/tasks`
        : "/tasks",
    },
    {
      label: "Secrets",
      href: workspaceId
        ? `/workspace/${workspaceId}/personal/secrets`
        : "/secrets",
      icon: KeyRound,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/personal/secrets`
        : "/secrets",
    },
    {
      label: "OpenCode",
      href: workspaceId
        ? `/workspace/${workspaceId}/personal/opencode`
        : "/opencode",
      icon: Terminal,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/personal/opencode`
        : "/opencode",
    },
  ];

  const settingsNavItems = [
    {
      label: "General",
      href: workspaceId
        ? `/workspace/${workspaceId}/settings/general`
        : "/settings/general",
      icon: Settings,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/settings/general`
        : "/settings/general",
    },
    {
      label: "Your Open Pieces",
      href: workspaceId
        ? `/workspace/${workspaceId}/settings/agent`
        : "/settings/agent",
      icon: Bot,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/settings/agent`
        : "/settings/agent",
    },
    {
      label: "Security",
      href: workspaceId
        ? `/workspace/${workspaceId}/settings/security`
        : "/settings/security",
      icon: Shield,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/settings/security`
        : "/settings/security",
    },
    {
      label: "Preferences",
      href: workspaceId
        ? `/workspace/${workspaceId}/settings/preferences`
        : "/settings/preferences",
      icon: Monitor,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/settings/preferences`
        : "/settings/preferences",
    },
    {
      label: "Hub",
      href: workspaceId
        ? `/workspace/${workspaceId}/settings/hub`
        : "/settings/hub",
      icon: ExternalLink,
      activePattern: workspaceId
        ? `/workspace/${workspaceId}/settings/hub`
        : "/settings/hub",
    },
  ];

  const navItems = isSettingsPage
    ? settingsNavItems
    : isBrainPage
      ? brainNavItems
      : personalNavItems;

  const appNavItems = [
    {
      label: "Personal",
      href: personalHref,
      icon: User,
      active: personalActive && !brainActive && !settingsActive,
    },
    {
      label: "Brain",
      href: brainHref,
      icon: Brain,
      active: brainActive,
    },
    {
      label: "Settings",
      href: settingsHref,
      icon: Settings,
      active: settingsActive,
    },
  ];

  const pageSectionTitle = isSettingsPage
    ? "Settings"
    : isBrainPage
      ? "Brain"
      : "Personal";

  useEffect(() => {
    startTransition(() => setMobileMenuOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const brandHref = workspaceId ? personalHref : "/";

  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center border-b border-[var(--border)] bg-[var(--background)]">
      <Link
        href={brandHref}
        className="flex min-w-0 shrink-0 items-center gap-3 pl-4 pr-2 lg:hidden"
        aria-label="OpenPieces"
      >
        <img
          src="/op-not-moving.png"
          alt="OpenPieces"
          className="h-8 w-8 rounded-lg object-cover"
        />
        <span className="truncate text-xl font-semibold text-[var(--foreground)]">
          OpenPieces
        </span>
      </Link>

      <nav className="hidden flex-1 flex-wrap items-center gap-1 px-6 scrollbar-hide lg:flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.label === "Overview" || item.label === "Brain"
              ? pathname === item.activePattern
              : pathname.startsWith(item.activePattern);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors group ${
                active
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={active ? 2.5 : 1.5}
                fill="none"
              />
              {item.label}
              <span
                className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-200 ${
                  active
                    ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]"
                    : "bg-[var(--accent)]/0 group-hover:bg-[var(--accent)]/40"
                }`}
              />
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-3 px-6">
        <ThemeToggle />
        <ProfileDropdown />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] lg:hidden"
          aria-expanded={mobileMenuOpen}
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <>
          {/* Full-screen backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-[fadeIn_0.2s_ease-out]"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar drawer from the left */}
          <div className="fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] shadow-2xl lg:hidden animate-[slideRight_0.25s_ease-out]">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 pt-5 pb-4">
              <Link
                href={brandHref}
                className="flex items-center gap-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img
                  src="/op-not-moving.png"
                  alt="OpenPieces"
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <span className="text-xl font-semibold text-[var(--foreground)]">
                  OpenPieces
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable navigation area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* App-level navigation */}
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Workspace
              </p>
              <nav className="flex flex-col gap-1 mb-6">
                {appNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        item.active
                          ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                          : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0"
                        strokeWidth={item.active ? 2.5 : 1.5}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Page-level navigation */}
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {pageSectionTitle}
              </p>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.label === "Overview" || item.label === "Brain"
                      ? pathname === item.activePattern
                      : pathname.startsWith(item.activePattern);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                          : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0"
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Workspace picker — sticky at the bottom, same width as nav items */}
            <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3">
              <WorkspaceSwitcher
                placement="up"
                activeWorkspaceId={workspaceId}
              />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
