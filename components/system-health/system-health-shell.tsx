"use client";

import { SystemHealthProvider } from "./system-health-context";
import { SystemHealthModal } from "./system-health-modal";

export function SystemHealthShell({ children }: { children: React.ReactNode }) {
  return (
    <SystemHealthProvider>
      {children}
      <SystemHealthModal />
    </SystemHealthProvider>
  );
}
