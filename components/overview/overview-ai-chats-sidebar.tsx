"use client";

import { MessageSquare, PanelLeftClose, Plus } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/basic/buttons/button";
import {
  Dropdown,
  type DropdownOption,
} from "@/components/basic/input/dropdown";
import type { AiChatStatus } from "@/lib/ai-chat/types";

export type SidebarChat = {
  id: string;
  title: string;
  status: AiChatStatus;
};

export const AGENT_TYPES = [
  "orchestrator",
  "architecture",
  "events",
  "brain",
  "qa",
] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  orchestrator: "AI",
  architecture: "Architecture",
  events: "Events",
  brain: "Brain",
  qa: "QA",
};

const AGENT_FILTER_OPTIONS: DropdownOption[] = [
  { label: "All", value: "" },
  ...AGENT_TYPES.map((type) => ({
    label: AGENT_TYPE_LABELS[type],
    value: type,
  })),
];

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
  className?: string;
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
  className,
}: OverviewAiChatsSidebarProps) {
  const navRef = useRef<HTMLDivElement>(null);

  const filterDropdownValue = selectedAgentType ?? "";

  const handleAgentFilterChange = useCallback(
    (value: string) => {
      if (value === "") {
        onFilterChange(null);
        return;
      }
      onFilterChange(value as AgentType);
    },
    [onFilterChange],
  );

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
    <aside
      className={`flex h-full min-h-0 w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-[var(--border)]">
        <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
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
      <Dropdown
        options={AGENT_FILTER_OPTIONS}
        value={filterDropdownValue}
        onChange={handleAgentFilterChange}
        placeholder="Agent"
        className="px-3 pb-2 mt-2"
        triggerClassName="h-9 min-h-0 py-2 px-3 text-xs bg-[var(--sidebar-bg)]"
      />
      <nav
        ref={navRef}
        className="flex min-h-0 flex-1 flex-col overflow-auto px-3 pb-4"
        onScroll={handleScroll}
      >
        {chats.length === 0 && isLoadingMore ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10">
            <p className="text-xs text-[var(--muted)]">Loading chats…</p>
          </div>
        ) : null}

        {chats.length === 0 && !isLoadingMore ? (
          <div
            className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              No chats yet
            </p>
            <p className="mt-1.5 max-w-[13rem] text-xs leading-relaxed text-[var(--muted)]">
              Conversations will show here.
            </p>
          </div>
        ) : null}

        {chats.length > 0 ? (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full rounded px-3 py-2 text-left text-[13px] transition-all hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] ${
                    selectedChatId === chat.id
                      ? "sidebar-active-bar bg-[var(--hover-bg-strong)] text-[var(--foreground)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate">{chat.title}</span>
                    {chat.status === "pending" ||
                    chat.status === "processing" ? (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--secondary)] shadow-[0_0_6px_var(--secondary-glow)]" />
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {chats.length > 0 && isLoadingMore ? (
          <div className="py-2 text-center text-xs text-[var(--muted)]">
            Loading…
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
