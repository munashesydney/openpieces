"use client";

import { PanelLeftClose, Plus } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/basic/buttons/button";
import type { AiChatStatus } from "@/lib/ai-chat/types";

export type SidebarChat = {
  id: string;
  title: string;
  status: AiChatStatus;
};

export const AGENT_TYPES = ["orchestrator", "architecture", "events", "brain"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  orchestrator: "AI",
  architecture: "Architecture",
  events: "Events",
  brain: "Brain",
};

type OverviewAiChatsSidebarProps = {
  chats: SidebarChat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onCollapse: () => void;
  onLoadMore: () => void;
  onFilterChange: (agentType: AgentType | null) => void;
  selectedAgentType: AgentType | null;
  hasMore: boolean;
  isLoadingMore: boolean;
};

export function OverviewAiChatsSidebar({
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onCollapse,
  onLoadMore,
  onFilterChange,
  selectedAgentType,
  hasMore,
  isLoadingMore,
}: OverviewAiChatsSidebarProps) {
  const navRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const nav = navRef.current;
    if (!nav) return;
    const { scrollTop, scrollHeight, clientHeight } = nav;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Chats
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--muted)]"
            aria-label="New chat"
            onClick={onNewChat}
          >
            <Plus className="h-4 w-4" />
          </Button>
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
      </div>
      <div className="flex flex-wrap gap-1 px-3 pb-2">
        <Button
          variant={selectedAgentType === null ? "primary" : "outline"}
          size="sm"
          className="h-6 text-xs px-1.5"
          onClick={() => onFilterChange(null)}
        >
          All
        </Button>
        {AGENT_TYPES.map((type) => (
          <Button
            key={type}
            variant={selectedAgentType === type ? "primary" : "outline"}
            size="sm"
            className="h-6 text-xs px-1.5"
            onClick={() => onFilterChange(type)}
          >
            {AGENT_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>
      <nav
        ref={navRef}
        className="flex-1 overflow-auto px-3 pb-4"
        onScroll={handleScroll}
      >
        <ul className="space-y-1">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => onSelectChat(chat.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] ${
                  selectedChatId === chat.id
                    ? "bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                    : "text-[var(--muted)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2">{chat.title}</span>
                  {chat.status === "pending" || chat.status === "processing" ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {isLoadingMore && (
          <div className="py-2 text-center text-xs text-[var(--muted)]">Loading...</div>
        )}
      </nav>
    </aside>
  );
}