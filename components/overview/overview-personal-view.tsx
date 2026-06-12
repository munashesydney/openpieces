"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import type {
  AiChatListItem,
  AiChatMessage,
  FileAttachment,
} from "@/lib/ai-chat/types";
import type {
  DeleteChatActionResult,
  RenameChatActionResult,
  SendAiMessageActionResult,
} from "@/app/org/[ordId]/workspace/[workspaceId]/personal/actions";
import {
  OverviewAiChatsSidebar,
  type AgentType,
} from "./overview-ai-chats-sidebar";
import {
  OverviewChatArea,
  type ChatMessage,
  type ContextInfo,
} from "./overview-chat-area";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import { OverviewComposer } from "./overview-composer";
import { useModelCapabilities } from "./model-picker";
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
    content: string,
    mode?: "agent" | "chat",
    attachments?: FileAttachment[],
  ) => Promise<SendAiMessageActionResult>;
  updateWorkspaceModelAction: (model: string) => Promise<void>;
  updateChatModelAction: (chatId: string, model: string) => Promise<void>;
  deleteChatAction: (chatId: string) => Promise<DeleteChatActionResult>;
  renameChatAction: (
    chatId: string,
    title: string,
  ) => Promise<RenameChatActionResult>;
};

function mapMessage(message: AiChatMessage): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    reasoning: message.reasoning,
    role: message.role,
    status: message.status,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
    attachments: message.attachments ?? [],
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
  return [
    chat,
    ...currentChats.filter((currentChat) => currentChat.id !== chat.id),
  ];
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
  deleteChatAction,
  renameChatAction,
}: OverviewPersonalViewProps) {
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>(initialChats.map(mapChat));
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialSelectedChatId,
  );
  const [hasMore, setHasMore] = useState(initialChats.length < initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(
    "orchestrator",
  );
  const [mode, setMode] = useState<"agent" | "chat">("agent");
  const pageSize = 20;
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() =>
    Object.fromEntries(
      Object.entries(initialMessages).map(([chatId, chatMessages]) => [
        chatId,
        chatMessages.map(mapMessage),
      ]),
    ),
  );
  const [isSending, setIsSending] = useState(false);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);
  const [workspaceModel, setWorkspaceModel] = useState(initialWorkspaceModel);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );
  const selectedChatStatus = selectedChat?.status;
  const selectedChatIsRunning =
    selectedChatStatus === "pending" || selectedChatStatus === "processing";

  const activeModel = selectedChat?.model ?? workspaceModel;
  const modelCapabilities = useModelCapabilities(activeModel);

  const selectedMessages = selectedChatId
    ? (messages[selectedChatId] ?? [])
    : [];

  // ── Chat stream hook ──
  const {
    messages: streamMessages,
    status: streamStatus,
    title: streamTitle,
    error: streamError,
    isLoading: streamLoading,
    refetch,
    stopPolling,
  } = useChatStream(selectedChatId);

  // Merge stream messages into the record (with optimistic assistant handling)
  useEffect(() => {
    if (!selectedChatId) return;

    setMessages((prev) => {
      const current = prev[selectedChatId] ?? [];
      const fetched = streamMessages;

      // If the fetched list already ends with an assistant message (any status),
      // the backend has created the real response — no need to keep the optimistic one.
      const lastFetched = fetched[fetched.length - 1];
      const hasAssistantInFetched = lastFetched?.role === "assistant";

      // Check if the current (optimistic) list has a pending assistant at the end
      const lastCurrent = current[current.length - 1];
      const hasOptimisticAssistant =
        lastCurrent &&
        lastCurrent.role === "assistant" &&
        lastCurrent.status === "pending" &&
        lastCurrent.content === "" &&
        !fetched.find((m) => m.id === lastCurrent.id);

      // Keep the optimistic message until a real assistant lands in the fetched list.
      if (!hasAssistantInFetched && hasOptimisticAssistant) {
        return {
          ...prev,
          [selectedChatId]: [...fetched, lastCurrent],
        };
      }

      return {
        ...prev,
        [selectedChatId]: fetched,
      };
    });
  }, [selectedChatId, streamMessages]);

  // Sync stream status into the chat list
  useEffect(() => {
    if (!selectedChatId || !streamStatus) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              status: (streamStatus as Chat["status"]) ?? chat.status,
              title: streamTitle ?? chat.title,
              error: streamError ?? null,
            }
          : chat,
      ),
    );
  }, [selectedChatId, streamStatus, streamTitle, streamError]);

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
      const response = await fetch(`/api/chats/${selectedChatId}/compact`, {
        method: "POST",
      });
      if (response.ok) {
        await refetch();
        await fetchContextInfo(selectedChatId);
      }
    } catch {
      // non-critical
    } finally {
      setIsCompacting(false);
    }
  }, [selectedChatId, isCompacting, refetch, fetchContextInfo]);

  const handleSend = async (text: string, attachments?: FileAttachment[]) => {
    const currentChatId = selectedChatId;
    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: text,
      reasoning: null,
      role: "user",
      status: "complete",
      toolCalls: [],
      toolResults: [],
      attachments: attachments ?? [],
    };

    const optimisticAssistant: ChatMessage = {
      id: crypto.randomUUID(),
      content: "",
      reasoning: null,
      role: "assistant",
      status: "pending",
      toolCalls: [],
      toolResults: [],
      attachments: [],
    };

    setIsSending(true);

    if (currentChatId) {
      setMessages((currentMessages) => ({
        ...currentMessages,
        [currentChatId]: [
          ...(currentMessages[currentChatId] ?? []),
          optimisticMessage,
          optimisticAssistant,
        ],
      }));

      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                title:
                  chat.title === "New chat"
                    ? text.slice(0, 48) || "New chat"
                    : chat.title,
                status: "pending",
                error: null,
              }
            : chat,
        ),
      );
    }

    try {
      const result = await sendMessageAction(
        currentChatId,
        text,
        mode,
        attachments,
      );

      if ("error" in result) {
        if (currentChatId) {
          setChats((currentChats) =>
            currentChats.map((c) =>
              c.id === currentChatId
                ? { ...c, status: "failed" as const, error: result.error }
                : c,
            ),
          );
          // Remove the optimistic assistant bubble
          setMessages((currentMessages) => ({
            ...currentMessages,
            [currentChatId]: (currentMessages[currentChatId] ?? []).slice(
              0,
              -1,
            ),
          }));
        } else {
          // New chat that failed — create a placeholder so the error banner renders
          const failedId = crypto.randomUUID();
          const failedChat: Chat = {
            id: failedId,
            title: text.slice(0, 48) || "New chat",
            status: "failed" as const,
            error: result.error,
            model: null,
          };
          setChats((currentChats) => [failedChat, ...currentChats]);
          setSelectedChatId(failedId);
          setMessages((currentMessages) => ({
            ...currentMessages,
            [failedId]: [optimisticMessage],
          }));
        }
        return;
      }

      const { chat } = result;
      const mappedChat = mapChat(chat);

      setChats((currentChats) => upsertChat(currentChats, mappedChat));
      setSelectedChatId(chat.id);

      if (!currentChatId) {
        setMessages((currentMessages) => ({
          ...currentMessages,
          [chat.id]: [optimisticMessage, optimisticAssistant],
        }));
      }

      await refetch();
    } catch (error) {
      console.error("Failed to send AI chat message:", error);
      if (currentChatId) {
        await refetch();
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleStop = useCallback(async () => {
    if (!selectedChatId) return;
    stopPolling();
    setIsSending(false);
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === selectedChatId
          ? { ...chat, status: "stopped" as typeof chat.status }
          : chat,
      ),
    );
    await fetch(`/api/chats/${selectedChatId}/stop`, { method: "POST" });
    await refetch();
  }, [selectedChatId, stopPolling, refetch]);

  const handleModelChange = useCallback(
    async (model: string) => {
      setWorkspaceModel(model);
      try {
        await updateWorkspaceModelAction(model);
        if (selectedChatId) {
          await updateChatModelAction(selectedChatId, model);
          setChats((currentChats) =>
            currentChats.map((chat) =>
              chat.id === selectedChatId ? { ...chat, model } : chat,
            ),
          );
          // Refetch context info with new model
          await fetchContextInfo(selectedChatId);
        }
      } catch (err) {
        console.error("Failed to update model:", err);
      }
    },
    [
      selectedChatId,
      fetchContextInfo,
      updateWorkspaceModelAction,
      updateChatModelAction,
    ],
  );

  const handleQuestionSubmit = useCallback(
    async (answers: Record<string, string>) => {
      const answersJson = JSON.stringify(answers, null, 2);
      await handleSend(answersJson);
    },
    [handleSend],
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = new URL(
        `${base}/api/chats?workspaceId=${workspaceId}&page=${nextPage}&pageSize=${pageSize}`,
      );
      if (selectedAgentType)
        url.searchParams.set("agentType", selectedAgentType);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to load more chats");
      const result = (await response.json()) as {
        data: AiChatListItem[];
        total: number;
      };
      const newChats = result.data.map(mapChat);
      setChats((prev) => [...prev, ...newChats]);
      setCurrentPage(nextPage);
      setHasMore(newChats.length > 0 && nextPage * pageSize < result.total);
    } catch (e) {
      console.error("Failed to load more chats:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage, workspaceId, selectedAgentType]);

  const handleFilterChange = useCallback(
    async (agentType: AgentType | null) => {
      if (agentType === null) {
        setSelectedAgentType(null);
      } else {
        setSelectedAgentType(agentType);
      }
      setCurrentPage(1);
      setChats([]);
      setIsLoadingMore(true);
      try {
        const base =
          typeof window !== "undefined" ? window.location.origin : "";
        const url = new URL(
          `${base}/api/chats?workspaceId=${workspaceId}&page=1&pageSize=${pageSize}`,
        );
        if (agentType) url.searchParams.set("agentType", agentType);
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to load chats");
        const result = (await response.json()) as {
          data: AiChatListItem[];
          total: number;
        };
        setChats(result.data.map(mapChat));
        setHasMore(result.data.length > 0 && result.data.length < result.total);
      } catch (e) {
        console.error(
          "Failed to filter chats:",
          e,
          "agentType:",
          agentType,
          "workspaceId:",
          workspaceId,
        );
      } finally {
        setIsLoadingMore(false);
      }
    },
    [workspaceId],
  );

  // Fetch context info when switching chats
  useEffect(() => {
    if (!selectedChatId) return;
    void fetchContextInfo(selectedChatId);
  }, [selectedChatId, fetchContextInfo]);

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
    [isLg],
  );

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      const result = await deleteChatAction(chatId);
      if ("error" in result) {
        console.error(result.error);
        return;
      }
      setChats((currentChats) =>
        currentChats.filter((chat) => chat.id !== chatId),
      );
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        stopPolling();
      }
    },
    [deleteChatAction, selectedChatId, stopPolling],
  );

  const handleRenameChat = useCallback(
    async (chatId: string, title: string) => {
      const result = await renameChatAction(chatId, title);
      if ("error" in result) {
        console.error(result.error);
        return;
      }
      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === chatId ? { ...chat, title } : chat,
        ),
      );
    },
    [renameChatAction],
  );

  const chatsSidebarProps = {
    chats: chats.map(({ id, title, status }) => ({ id, title, status })),
    selectedChatId,
    onSelectChat: handleSelectChat,
    onNewChat: () => {
      setSelectedChatId(null);
      stopPolling();
    },
    onCollapse: () => setSidebarOpen(false),
    onLoadMore: handleLoadMore,
    onFilterChange: handleFilterChange,
    selectedAgentType,
    hasMore,
    isLoadingMore,
    onDeleteChat: handleDeleteChat,
    onRenameChat: handleRenameChat,
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {sidebarOpen && isLg ? (
        <OverviewAiChatsSidebar {...chatsSidebarProps} />
      ) : null}
      {sidebarOpen && !isLg ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[40] bg-black/40 lg:hidden"
            aria-label="Close chats"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[45] flex w-[min(100vw-1rem,18rem)] max-w-[calc(100vw-1rem)] flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] shadow-xl lg:hidden">
            <OverviewAiChatsSidebar
              {...chatsSidebarProps}
              className="w-full border-r-0"
            />
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
              {streamLoading ? (
                <div className="h-5 w-48 rounded-md animate-pulse bg-[var(--hover-bg)]" />
              ) : (
                <h2 className="text-sm font-semibold text-[var(--foreground)] text-center line-clamp-2">
                  {selectedChat.title}
                </h2>
              )}
            </header>
            <OverviewChatArea
              messages={selectedMessages}
              status={selectedChat.status}
              error={selectedChat.error}
              isChatRunning={selectedChatIsRunning}
              isLoadingMessages={streamLoading}
              onQuestionSubmit={handleQuestionSubmit}
            />
            <div className="shrink-0 animate-[slideDown_0.4s_ease-out_both]">
              <OverviewComposer
                onSend={handleSend}
                onStop={handleStop}
                onCompact={handleCompact}
                disabled={
                  selectedChat.status === "pending" ||
                  selectedChat.status === "processing"
                }
                isSending={isSending || streamLoading}
                isRunning={selectedChatIsRunning}
                isCompacting={isCompacting}
                contextInfo={contextInfo}
                model={selectedChat.model ?? workspaceModel}
                onModelChange={handleModelChange}
                mode={mode}
                onModeChange={setMode}
                modelCapabilities={modelCapabilities}
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
              mode={mode}
              onModeChange={setMode}
              modelCapabilities={modelCapabilities}
            />
          </div>
        )}
      </div>
    </div>
  );
}
