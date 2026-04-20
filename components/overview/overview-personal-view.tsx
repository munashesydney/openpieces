"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import type { AiChatListItem, AiChatMessage } from "@/lib/ai-chat/types";
import type { SendAiMessageActionResult } from "@/app/workspace/[workspaceId]/personal/actions";
import { OverviewAiChatsSidebar, type AgentType } from "./overview-ai-chats-sidebar";
import { OverviewChatArea, type ChatMessage, type ContextInfo } from "./overview-chat-area";
import { OverviewComposer } from "./overview-composer";
import { OverviewTitle } from "./overview-title";

type Chat = {
  id: string;
  title: string;
  status: AiChatListItem["status"];
  error: string | null;
  model: string | null;
};

type OverviewPersonalViewProps = {
  workspaceId: string;
  initialChats: AiChatListItem[];
  initialSelectedChatId: string | null;
  initialMessages: Record<string, AiChatMessage[]>;
  initialTotal: number;
  initialWorkspaceModel: string;
  sendMessageAction: (
    chatId: string | null,
    content: string
  ) => Promise<SendAiMessageActionResult>;
  updateWorkspaceModelAction: (model: string) => Promise<void>;
  updateChatModelAction: (chatId: string, model: string) => Promise<void>;
};

function mapMessage(message: AiChatMessage): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    role: message.role,
    status: message.status,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
  };
}

function mapChat(chat: AiChatListItem): Chat {
  return {
    id: chat.id,
    title: chat.title,
    status: chat.status,
    error: chat.error,
    model: chat.model ?? null,
  };
}

function upsertChat(currentChats: Chat[], chat: Chat): Chat[] {
  return [chat, ...currentChats.filter((currentChat) => currentChat.id !== chat.id)];
}

export function OverviewPersonalView({
  workspaceId,
  initialChats,
  initialSelectedChatId,
  initialMessages,
  initialTotal,
  initialWorkspaceModel,
  sendMessageAction,
  updateWorkspaceModelAction,
  updateChatModelAction,
}: OverviewPersonalViewProps) {
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useLayoutEffect(() => {
    setSidebarOpen(isLg);
  }, [isLg]);
  const [chats, setChats] = useState<Chat[]>(initialChats.map(mapChat));
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedChatId);
  const [hasMore, setHasMore] = useState(initialChats.length < initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>("orchestrator");
  const pageSize = 20;
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() =>
    Object.fromEntries(
      Object.entries(initialMessages).map(([chatId, chatMessages]) => [
        chatId,
        chatMessages.map(mapMessage),
      ])
    )
  );
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [workspaceModel, setWorkspaceModel] = useState(initialWorkspaceModel);
  const pollingRef = useRef<number | null>(null);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );
  const selectedChatStatus = selectedChat?.status;
  const selectedChatIsRunning =
    selectedChatStatus === "pending" || selectedChatStatus === "processing";

  const selectedMessages = selectedChatId ? messages[selectedChatId] ?? [] : [];

  const clearPolling = () => {
    if (pollingRef.current != null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);

    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      const data = (await response.json()) as { messages?: AiChatMessage[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load messages.");
      }

      setMessages((currentMessages) => ({
        ...currentMessages,
        [chatId]: (data.messages ?? []).map(mapMessage),
      }));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchContextInfo = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/context`);
      if (!response.ok) return;
      const info = (await response.json()) as ContextInfo;
      setContextInfo(info);
    } catch {
      // non-critical
    }
  }, []);

  const handleCompact = useCallback(async () => {
    if (!selectedChatId || isCompacting) return;
    setIsCompacting(true);
    try {
      const response = await fetch(`/api/chats/${selectedChatId}/compact`, { method: "POST" });
      if (response.ok) {
        await fetchMessages(selectedChatId);
        await fetchContextInfo(selectedChatId);
      }
    } catch {
      // non-critical
    } finally {
      setIsCompacting(false);
    }
  }, [selectedChatId, isCompacting, fetchMessages, fetchContextInfo]);

  const startPolling = useCallback(
    (chatId: string) => {
      clearPolling();

      pollingRef.current = window.setInterval(async () => {
        const response = await fetch(`/api/chats/${chatId}/status`);
        const data = (await response.json()) as {
          status?: Chat["status"];
          error?: string | null;
        };

        if (!response.ok) {
          clearPolling();
          return;
        }

        setChats((currentChats) =>
          currentChats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  status: data.status ?? chat.status,
                  error: data.error ?? null,
                }
              : chat
          )
        );

        await fetchMessages(chatId);

        if (data.status === "pending" || data.status === "processing") {
          return;
        }

        clearPolling();
      }, 1500);
    },
    [fetchMessages]
  );

  const handleSend = async (text: string) => {
    const currentChatId = selectedChatId;
    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      role: "user",
      status: "complete",
      toolCalls: [],
      toolResults: [],
    };

    setIsSending(true);

    if (currentChatId) {
      setMessages((currentMessages) => ({
        ...currentMessages,
        [currentChatId]: [...(currentMessages[currentChatId] ?? []), optimisticMessage],
      }));

      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                title: chat.title === "New chat" ? text.slice(0, 48) || "New chat" : chat.title,
                status: "pending",
                error: null,
              }
            : chat
        )
      );
    }

    try {
      const { chat } = await sendMessageAction(currentChatId, text);
      const mappedChat = mapChat(chat);

      setChats((currentChats) => upsertChat(currentChats, mappedChat));
      setSelectedChatId(chat.id);

      if (!currentChatId) {
        setMessages((currentMessages) => ({
          ...currentMessages,
          [chat.id]: [],
        }));
      }

      await fetchMessages(chat.id);
      startPolling(chat.id);
    } catch (error) {
      console.error("Failed to send AI chat message:", error);
      if (currentChatId) {
        await fetchMessages(currentChatId);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleStop = useCallback(async () => {
    if (!selectedChatId) return;
    clearPolling();
    setIsSending(false);
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === selectedChatId
          ? { ...chat, status: "stopped" as (typeof chat.status) }
          : chat
      )
    );
    await fetch(`/api/chats/${selectedChatId}/stop`, { method: "POST" });
  }, [selectedChatId, clearPolling]);

  const handleModelChange = useCallback(
    async (model: string) => {
      setWorkspaceModel(model);
      try {
        await updateWorkspaceModelAction(model);
        if (selectedChatId) {
          await updateChatModelAction(selectedChatId, model);
          setChats((currentChats) =>
            currentChats.map((chat) =>
              chat.id === selectedChatId
                ? { ...chat, model }
                : chat
            )
          );
          // Refetch context info with new model
          await fetchContextInfo(selectedChatId);
        }
      } catch (err) {
        console.error("Failed to update model:", err);
      }
    },
    [selectedChatId, fetchContextInfo, updateWorkspaceModelAction, updateChatModelAction]
  );

  const handleQuestionSubmit = useCallback(
    async (answers: Record<string, string>) => {
      const answersJson = JSON.stringify(answers, null, 2);
      await handleSend(answersJson);
    },
    [handleSend]
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = new URL(`${base}/api/chats?workspaceId=${workspaceId}&page=${nextPage}&pageSize=${pageSize}`);
      if (selectedAgentType) url.searchParams.set("agentType", selectedAgentType);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to load more chats");
      const result = (await response.json()) as { data: AiChatListItem[]; total: number };
      const newChats = result.data.map(mapChat);
      setChats((prev) => [...prev, ...newChats]);
      setCurrentPage(nextPage);
      setHasMore(newChats.length > 0 && (nextPage * pageSize) < result.total);
    } catch (e) {
      console.error("Failed to load more chats:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage, workspaceId, selectedAgentType]);

  const handleFilterChange = useCallback(async (agentType: AgentType | null) => {
    if (agentType === null) {
      setSelectedAgentType(null);
    } else {
      setSelectedAgentType(agentType);
    }
    setCurrentPage(1);
    setChats([]);
    setIsLoadingMore(true);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = new URL(`${base}/api/chats?workspaceId=${workspaceId}&page=1&pageSize=${pageSize}`);
      if (agentType) url.searchParams.set("agentType", agentType);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to load chats");
      const result = (await response.json()) as { data: AiChatListItem[]; total: number };
      setChats(result.data.map(mapChat));
      setHasMore(result.data.length > 0 && result.data.length < result.total);
    } catch (e) {
      console.error("Failed to filter chats:", e, "agentType:", agentType, "workspaceId:", workspaceId);
    } finally {
      setIsLoadingMore(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  useEffect(() => {
    if (!selectedChatId) {
      setLoadingMessages(false);
      return;
    }

    void fetchMessages(selectedChatId);
    void fetchContextInfo(selectedChatId);
  }, [selectedChatId, fetchMessages, fetchContextInfo]);

  useEffect(() => {
    if (!selectedChatId) {
      clearPolling();
      return;
    }

    if (selectedChatIsRunning) {
      startPolling(selectedChatId);
      return;
    }

    clearPolling();
  }, [selectedChatId, selectedChatIsRunning, startPolling]);

  useEffect(() => {
    if (!sidebarOpen || isLg) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen, isLg]);

  useEffect(() => {
    if (!sidebarOpen || isLg) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, isLg]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setSelectedChatId(chatId);
      if (!isLg) setSidebarOpen(false);
    },
    [isLg]
  );

  const chatsSidebarProps = {
    chats: chats.map(({ id, title, status }) => ({ id, title, status })),
    selectedChatId,
    onSelectChat: handleSelectChat,
    onNewChat: () => {
      setSelectedChatId(null);
      clearPolling();
    },
    onCollapse: () => setSidebarOpen(false),
    onLoadMore: handleLoadMore,
    onFilterChange: handleFilterChange,
    selectedAgentType,
    hasMore,
    isLoadingMore,
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {sidebarOpen && isLg ? <OverviewAiChatsSidebar {...chatsSidebarProps} /> : null}
      {sidebarOpen && !isLg ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[40] bg-black/40 lg:hidden"
            aria-label="Close chats"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[45] flex w-[min(100vw-1rem,18rem)] max-w-[calc(100vw-1rem)] flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] shadow-xl lg:hidden">
            <OverviewAiChatsSidebar {...chatsSidebarProps} className="w-full border-r-0" />
          </div>
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
        {!sidebarOpen && (
          <div className="flex items-center px-4 pt-4 sm:px-6 shrink-0">
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

        {selectedChat ? (
          <>
            <header className="shrink-0 px-4 py-4 sm:px-6 sm:py-5 flex justify-center">
              <h2 className="text-sm font-semibold text-[var(--foreground)] text-center line-clamp-2">
                {selectedChat.title}
              </h2>
            </header>
            <OverviewChatArea
              messages={selectedMessages}
              status={selectedChat.status}
              error={selectedChat.error}
              isChatRunning={selectedChatIsRunning}
              isLoadingMessages={loadingMessages}
              onQuestionSubmit={handleQuestionSubmit}
            />
            <div className="shrink-0 animate-[slideDown_0.4s_ease-out_both]">
              <OverviewComposer
                onSend={handleSend}
                onStop={handleStop}
                onCompact={handleCompact}
                disabled={selectedChat.status === "pending" || selectedChat.status === "processing"}
                isSending={isSending || loadingMessages}
                isRunning={selectedChatIsRunning}
                isCompacting={isCompacting}
                contextInfo={contextInfo}
                model={selectedChat.model ?? workspaceModel}
                onModelChange={handleModelChange}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <OverviewTitle />
            <div className="flex items-center justify-center px-4 sm:px-6 w-full shrink-0">
              <div className="mt-10 h-px w-full max-w-[920px] bg-[var(--border)]" />
            </div>
            <OverviewComposer 
              onSend={handleSend} 
              isSending={isSending} 
              model={workspaceModel}
              onModelChange={handleModelChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
