"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import type { AiChatListItem, AiChatMessage } from "@/lib/ai-chat/types";
import { OverviewAiChatsSidebar } from "./overview-ai-chats-sidebar";
import { OverviewChatArea, type ChatMessage } from "./overview-chat-area";
import { OverviewComposer } from "./overview-composer";
import { OverviewTitle } from "./overview-title";

type Chat = {
  id: string;
  title: string;
  status: AiChatListItem["status"];
  error: string | null;
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

export function OverviewPersonalView({ workspaceId }: { workspaceId: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

  const fetchChats = useCallback(async (preferredChatId?: string) => {
    const response = await fetch(`/api/chats?workspaceId=${workspaceId}`);
    const data = (await response.json()) as { chats?: AiChatListItem[]; error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load chats.");
    }

    const nextChats =
      data.chats?.map((chat) => ({
        id: chat.id,
        title: chat.title,
        status: chat.status,
        error: chat.error,
      })) ?? [];

    setChats(nextChats);

    if (preferredChatId && nextChats.some((chat) => chat.id === preferredChatId)) {
      setSelectedChatId(preferredChatId);
      return;
    }

    setSelectedChatId((currentSelected) => {
      if (currentSelected && nextChats.some((chat) => chat.id === currentSelected)) {
        return currentSelected;
      }

      return nextChats[0]?.id ?? null;
    });
  }, [workspaceId]);

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

  const startPolling = useCallback((chatId: string) => {
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
      await fetchChats(chatId);
    }, 1500);
  }, [fetchChats, fetchMessages]);

  const createChat = async () => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId,
      }),
    });

    const data = (await response.json()) as Partial<AiChatListItem> & { error?: string };

    if (!response.ok || !data.id) {
      throw new Error(data.error ?? "Failed to create chat.");
    }

    const nextChat: Chat = {
      id: data.id,
      title: data.title ?? "New chat",
      status: data.status ?? "idle",
      error: data.error ?? null,
    };

    setChats((currentChats) => [nextChat, ...currentChats]);
    setSelectedChatId(nextChat.id);
    setMessages((currentMessages) => ({
      ...currentMessages,
      [nextChat.id]: [],
    }));

    return nextChat.id;
  };

  const handleSend = async (text: string) => {
    setIsSending(true);

    try {
      let chatId = selectedChatId;
      if (!chatId) {
        chatId = await createChat();
      }

      const optimisticMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: text,
        role: "user",
        status: "complete",
        toolCalls: [],
        toolResults: [],
      };

      setMessages((currentMessages) => ({
        ...currentMessages,
        [chatId]: [...(currentMessages[chatId] ?? []), optimisticMessage],
      }));

      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: chat.title === "New chat" ? text.slice(0, 48) || "New chat" : chat.title,
                status: "pending",
                error: null,
              }
            : chat
        )
      );

      const response = await fetch(`/api/chat?chatId=${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: text,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send chat message.");
      }

      await Promise.all([fetchChats(chatId), fetchMessages(chatId)]);
      startPolling(chatId);
    } catch (error) {
      console.error("Failed to send AI chat message:", error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await fetchChats();
      } catch (error) {
        console.error("Failed to load chats:", error);
      } finally {
        if (active) {
          setLoadingChats(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
      clearPolling();
    };
  }, [workspaceId, fetchChats]);

  useEffect(() => {
    if (!selectedChatId) {
      setLoadingMessages(false);
      return;
    }

    void fetchMessages(selectedChatId);
  }, [selectedChatId, fetchMessages]);

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

        {loadingChats ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
            Loading chats...
          </div>
        ) : selectedChat ? (
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
            />
            <div className="shrink-0 animate-[slideDown_0.4s_ease-out_both]">
              <OverviewComposer
                onSend={handleSend}
                disabled={selectedChat.status === "pending" || selectedChat.status === "processing"}
                isSending={isSending || loadingMessages}
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
