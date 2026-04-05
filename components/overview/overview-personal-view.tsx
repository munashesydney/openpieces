"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import type { AiChatListItem, AiChatMessage } from "@/lib/ai-chat/types";
import type { SendAiMessageActionResult } from "@/app/workspace/[workspaceId]/personal/actions";
import { OverviewAiChatsSidebar } from "./overview-ai-chats-sidebar";
import { OverviewChatArea, type ChatMessage, type ContextInfo } from "./overview-chat-area";
import { OverviewComposer } from "./overview-composer";
import { OverviewTitle } from "./overview-title";

type Chat = {
  id: string;
  title: string;
  status: AiChatListItem["status"];
  error: string | null;
};

type OverviewPersonalViewProps = {
  workspaceId: string;
  initialChats: AiChatListItem[];
  initialSelectedChatId: string | null;
  initialMessages: Record<string, AiChatMessage[]>;
  initialTotal: number;
  sendMessageAction: (
    chatId: string | null,
    content: string
  ) => Promise<SendAiMessageActionResult>;
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
  sendMessageAction,
}: OverviewPersonalViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>(initialChats.map(mapChat));
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedChatId);
  const [hasMore, setHasMore] = useState(initialChats.length < initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
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

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await fetch(
        `/api/chats?workspaceId=${workspaceId}&page=${nextPage}&pageSize=${pageSize}`
      );
      if (!response.ok) throw new Error("Failed to load more chats");
      const result = (await response.json()) as { data: AiChatListItem[]; total: number };
      const newChats = result.data.map(mapChat);
      setChats((prev) => [...prev, ...newChats]);
      setCurrentPage(nextPage);
      setHasMore(newChats.length > 0 && (nextPage * pageSize) < result.total);
    } catch {
      // non-critical
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage, workspaceId]);

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

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {sidebarOpen && (
        <OverviewAiChatsSidebar
          chats={chats.map(({ id, title, status }) => ({ id, title, status }))}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onNewChat={() => {
            setSelectedChatId(null);
            clearPolling();
          }}
          onCollapse={() => setSidebarOpen(false)}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col min-h-0 overflow-hidden">
        {!sidebarOpen && (
          <div className="flex items-center px-6 pt-4 shrink-0">
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
            <header className="shrink-0 px-6 py-5 flex justify-center">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {selectedChat.title}
              </h2>
            </header>
            <OverviewChatArea
              messages={selectedMessages}
              status={selectedChat.status}
              error={selectedChat.error}
              isChatRunning={selectedChatIsRunning}
              isLoadingMessages={loadingMessages}
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
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <OverviewTitle />
            <div className="flex items-center justify-center px-6 w-full shrink-0">
              <div className="mt-10 h-px w-full max-w-[920px] bg-[var(--border)]" />
            </div>
            <OverviewComposer onSend={handleSend} isSending={isSending} />
          </div>
        )}
      </div>
    </div>
  );
}
