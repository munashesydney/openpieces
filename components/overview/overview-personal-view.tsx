"use client";

import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { OverviewAiChatsSidebar } from "./overview-ai-chats-sidebar";
import { OverviewComposer } from "./overview-composer";
import { OverviewTitle } from "./overview-title";

export function OverviewPersonalView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-full min-h-full">
      {sidebarOpen && (
        <OverviewAiChatsSidebar onCollapse={() => setSidebarOpen(false)} />
      )}
      <div className="min-w-0 flex-1">
        {!sidebarOpen && (
          <div className="flex items-center px-6 pt-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[var(--muted)]"
              aria-label="Show chats sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          </div>
        )}
        <OverviewTitle />
        <div className="flex items-center justify-center px-6">
          <div className="mt-10 h-px w-full max-w-[920px] bg-[var(--border)]" />
        </div>
        <OverviewComposer />
      </div>
    </div>
  );
}
