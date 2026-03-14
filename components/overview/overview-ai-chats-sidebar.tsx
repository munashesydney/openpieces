"use client";

import { PanelLeftClose } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";

const PLACEHOLDER_CHATS = [
  { id: "1", title: "Automate weekly report" },
  { id: "2", title: "Data pipeline review" },
  { id: "3", title: "API integration help" },
];

type OverviewAiChatsSidebarProps = {
  onCollapse: () => void;
};

export function OverviewAiChatsSidebar({ onCollapse }: OverviewAiChatsSidebarProps) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Chats
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-[var(--muted)]"
          aria-label="Collapse sidebar"
          onClick={onCollapse}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 overflow-auto px-3 pb-4">
        <ul className="space-y-1">
          {PLACEHOLDER_CHATS.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              >
                <span className="line-clamp-2">{chat.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
