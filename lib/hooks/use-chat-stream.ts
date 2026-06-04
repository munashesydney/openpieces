import { useCallback, useEffect, useRef, useState } from "react";
import type { AiChatMessage } from "@/lib/ai-chat/types";
import type { ChatMessage } from "@/components/overview/overview-chat-area";

type StreamStatus = {
  status: string | null;
  title: string | null;
  error: string | null;
};

type UseChatStreamResult = {
  /** Raw messages fetched from the server (already mapped to ChatMessage). */
  messages: ChatMessage[];
  /** Chat-level status (pending / processing / completed / failed / stopped). */
  status: string | null;
  title: string | null;
  error: string | null;
  /** True while an initial or refetch request is in-flight. */
  isLoading: boolean;
  /** Manually trigger a fresh fetch of messages + status. */
  refetch: () => Promise<void>;
  /** Immediately stop the polling interval. */
  stopPolling: () => void;
};

function toChatMessage(msg: AiChatMessage): ChatMessage {
  return {
    id: msg.id,
    content: msg.content,
    reasoning: msg.reasoning,
    role: msg.role,
    status: msg.status,
    toolCalls: msg.toolCalls,
    toolResults: msg.toolResults,
  };
}

async function fetchMessages(chatId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chats/${chatId}/messages`);
  const data = (await res.json()) as {
    messages?: AiChatMessage[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to load messages.");
  return (data.messages ?? []).map(toChatMessage);
}

async function fetchStatus(chatId: string): Promise<StreamStatus> {
  const res = await fetch(`/api/chats/${chatId}/status`);
  if (!res.ok) return { status: null, title: null, error: null };
  const data = (await res.json()) as {
    status?: string;
    title?: string;
    error?: string | null;
  };
  return {
    status: data.status ?? null,
    title: data.title ?? null,
    error: data.error ?? null,
  };
}

function isRunning(s: string | null): boolean {
  return s === "pending" || s === "processing";
}

export function useChatStream(chatId: string | null): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const chatIdRef = useRef(chatId);

  // Keep a ref so the interval closure always reads the latest chatId
  chatIdRef.current = chatId;

  const clearPolling = useCallback(() => {
    if (pollingRef.current != null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const load = useCallback(async (id: string) => {
    // Fetch messages and status independently so one failure doesn't
    // block the other from updating state.
    const [msgs, st] = await Promise.allSettled([
      fetchMessages(id),
      fetchStatus(id),
    ]);

    if (msgs.status === "fulfilled") {
      setMessages(msgs.value);
    }

    if (st.status === "fulfilled") {
      setStatus(st.value.status);
      setTitle(st.value.title);
      setError(st.value.error);
      return st.value.status;
    }

    return null;
  }, []);

  // Start polling — reads latest chatId from the ref
  const startPolling = useCallback(() => {
    clearPolling();
    const id = chatIdRef.current;
    if (!id) return;

    pollingRef.current = window.setInterval(async () => {
      const currentId = chatIdRef.current;
      if (!currentId) {
        clearPolling();
        return;
      }

      const [stResult, msgsResult] = await Promise.allSettled([
        fetchStatus(currentId),
        fetchMessages(currentId),
      ]);

      if (stResult.status === "fulfilled") {
        setStatus(stResult.value.status);
        setTitle(stResult.value.title);
        setError(stResult.value.error);

        if (!isRunning(stResult.value.status)) {
          clearPolling();
        }
      }

      if (msgsResult.status === "fulfilled") {
        setMessages(msgsResult.value);
      }
    }, 1500);
  }, [clearPolling]);

  const refetch = useCallback(async () => {
    if (!chatIdRef.current) return;
    setIsLoading(true);
    try {
      const s = await load(chatIdRef.current);
      if (isRunning(s)) startPolling();
    } finally {
      setIsLoading(false);
    }
  }, [load, startPolling]);

  // Main lifecycle: reset + fetch on chatId change
  useEffect(() => {
    clearPolling();

    if (!chatId) {
      setMessages([]);
      setStatus(null);
      setTitle(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    load(chatId)
      .then((s) => {
        if (isRunning(s)) startPolling();
      })
      .finally(() => setIsLoading(false));

    return () => clearPolling();
  }, [chatId, clearPolling, load, startPolling]);

  const stopPolling = useCallback(() => {
    clearPolling();
  }, [clearPolling]);

  return { messages, status, title, error, isLoading, refetch, stopPolling };
}
