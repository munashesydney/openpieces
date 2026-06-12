"use client";

import {
  MessageSquare,
  PanelLeftClose,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  ActionMenu,
  type ActionMenuOption,
} from "@/components/basic/input/action-menu";
import { Button } from "@/components/basic/buttons/button";
import { ChatDeleteModal } from "./chat-delete-modal";
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
  onRenameChat?: (chatId: string, title: string) => void;
  onDeleteChat?: (chatId: string) => void;
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
  onRenameChat,
  onDeleteChat,
  className,
}: OverviewAiChatsSidebarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingChat, setDeletingChat] = useState<SidebarChat | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const startRenaming = useCallback((chatId: string, currentTitle: string) => {
    setRenamingChatId(chatId);
    setRenameValue(currentTitle);
    // Focus the input on next tick after render
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, []);

  const cancelRenaming = useCallback(() => {
    setRenamingChatId(null);
    setRenameValue("");
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingChat) return;
    setIsDeleting(true);
    await onDeleteChat?.(deletingChat.id);
    setIsDeleting(false);
    setDeletingChat(null);
  }, [deletingChat, onDeleteChat]);

  const submitRenaming = useCallback(
    (chatId: string) => {
      const trimmed = renameValue.trim();
      if (trimmed && trimmed !== chats.find((c) => c.id === chatId)?.title) {
        onRenameChat?.(chatId, trimmed);
      }
      setRenamingChatId(null);
      setRenameValue("");
    },
    [renameValue, chats, onRenameChat],
  );

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
            {chats.map((chat) => {
              const isRenaming = renamingChatId === chat.id;

              const actionMenuOptions: ActionMenuOption[] = [
                {
                  label: "Rename",
                  value: "rename",
                  icon: <Pencil className="h-4 w-4" />,
                },
                {
                  label: "Delete",
                  value: "delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  destructive: true,
                },
              ];

              return (
                <li key={chat.id}>
                  <div
                    className={`group flex items-center rounded transition-all ${
                      selectedChatId === chat.id
                        ? "sidebar-active-bar bg-[var(--hover-bg-strong)]"
                        : "hover:bg-[var(--hover-bg)]"
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex-1 px-3 py-2">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              submitRenaming(chat.id);
                            } else if (e.key === "Escape") {
                              cancelRenaming();
                            }
                          }}
                          onBlur={() => submitRenaming(chat.id)}
                          className="w-full rounded border border-[var(--accent)] bg-[var(--input-bg)] px-2 py-1 text-[13px] text-[var(--foreground)] outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectChat(chat.id)}
                        className={`flex-1 truncate rounded-l px-3 py-2 text-left text-[13px] transition-all hover:text-[var(--foreground)] ${
                          selectedChatId === chat.id
                            ? "text-[var(--foreground)]"
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
                    )}
                    {!isRenaming ? (
                      <div
                        className={`flex shrink-0 items-center pr-1 transition-opacity ${
                          selectedChatId === chat.id
                            ? "opacity-100"
                            : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                        }`}
                      >
                        <ActionMenu
                          options={actionMenuOptions}
                          onSelect={(value) => {
                            if (value === "rename") {
                              startRenaming(chat.id, chat.title);
                            } else if (value === "delete") {
                              setDeletingChat(chat);
                            }
                          }}
                          triggerClassName="hover:border-transparent hover:bg-transparent"
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {chats.length > 0 && isLoadingMore ? (
          <div className="py-2 text-center text-xs text-[var(--muted)]">
            Loading…
          </div>
        ) : null}
      </nav>

      <ChatDeleteModal
        isOpen={deletingChat !== null}
        onClose={() => setDeletingChat(null)}
        onConfirm={confirmDelete}
        chatTitle={deletingChat?.title ?? ""}
        isPending={isDeleting}
      />
    </aside>
  );
}
