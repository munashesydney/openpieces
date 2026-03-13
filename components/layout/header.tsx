"use client";

import {
  LayoutDashboard,
  Workflow,
  Settings,
  Shield,
  Bell,
  Globe,
  Monitor,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const workspaceId = segments[1]; // ['', 'workspace', '{id}', ...] -> ['workspace','{id}',...]

  const isSettingsPage = pathname.includes("/settings");

  const personalNavItems = [
    {
      label: "Overview",
      href: workspaceId ? `/workspace/${workspaceId}/personal` : "/",
      icon: LayoutDashboard,
      activePattern: workspaceId ? `/workspace/${workspaceId}/personal` : "/",
    },
    {
      label: "Services",
      href: workspaceId ? `/workspace/${workspaceId}/personal/services` : "/services",
      icon: Workflow,
      activePattern: workspaceId ? `/workspace/${workspaceId}/personal/services` : "/services",
    },
  ];

  const settingsNavItems = [
    {
      label: "General",
      href: workspaceId ? `/workspace/${workspaceId}/settings/general` : "/settings/general",
      icon: Settings,
      activePattern: workspaceId ? `/workspace/${workspaceId}/settings/general` : "/settings/general",
    },
    {
      label: "Security",
      href: workspaceId ? `/workspace/${workspaceId}/settings/security` : "/settings/security",
      icon: Shield,
      activePattern: workspaceId ? `/workspace/${workspaceId}/settings/security` : "/settings/security",
    },
    {
      label: "Notifications",
      href: workspaceId ? `/workspace/${workspaceId}/settings/notifications` : "/settings/notifications",
      icon: Bell,
      activePattern: workspaceId ? `/workspace/${workspaceId}/settings/notifications` : "/settings/notifications",
    },
    {
      label: "Preferences",
      href: workspaceId ? `/workspace/${workspaceId}/settings/preferences` : "/settings/preferences",
      icon: Monitor,
      activePattern: workspaceId ? `/workspace/${workspaceId}/settings/preferences` : "/settings/preferences",
    },
    {
      label: "Advanced",
      href: workspaceId ? `/workspace/${workspaceId}/settings/advanced` : "/settings/advanced",
      icon: Globe,
      activePattern: workspaceId ? `/workspace/${workspaceId}/settings/advanced` : "/settings/advanced",
    },
  ];

  const navItems = isSettingsPage ? settingsNavItems : personalNavItems;

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[var(--border)] bg-[var(--background)]">
      <nav className="flex flex-1 flex-wrap items-center gap-1 px-6 scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.label === "Overview" 
            ? pathname === item.activePattern 
            : pathname.startsWith(item.activePattern);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={active ? 2.5 : 1.5}
                fill={active ? "currentColor" : "none"}
              />
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-3 px-6">
        <ThemeToggle />
        <button
          type="button"
          className="rounded-lg p-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
