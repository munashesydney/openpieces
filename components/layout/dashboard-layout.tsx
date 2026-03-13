"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === "true";
  });

  const handleToggle = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={handleToggle} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {children}
      </div>
    </div>
  );
}
