"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ChatMessage,
  ToolChip,
} from "@/components/opencode/opencode-message-card";

/**
 * Single source of truth for OpenCode session streaming.
 * Shared by opencode-page.tsx (full chat) and spawn-opencode-card.tsx (inline overview).
 *
 * Opens an EventSource to /api/opencode/sessions/{id}/events and builds
 * ChatMessage[] progressively from message.part.delta / part.updated events.
 * Falls back to polling when SSE errors out.
 */

type UseOpenCodeStreamResult = {
  messages: ChatMessage[];
  /** True while the session is busy (agent is working). */
  isStreaming: boolean;
  /** Current session status: idle, busy, error, or null if unknown. */
  sessionStatus: "idle" | "busy" | "error" | null;
  /** True during initial API fetch. */
  isLoading: boolean;
  /** Last SSE or fetch error, if any. */
  error: string | null;
  /** Append a user message to the chat (call before POSTing to the API). */
  addUserMessage: (content: string) => void;
};

export function useOpenCodeStream(
  sessionId: string | null,
): UseOpenCodeStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<
    "idle" | "busy" | "error" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingMsgIdsRef = useRef<Set<string>>(new Set());
  const skipMsgIdsRef = useRef<Set<string>>(new Set());
  const sessionRef = useRef(sessionId);
  const statusRef = useRef<"idle" | "busy" | "error" | null>(null);

  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  // ── Helpers ────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const id = sessionRef.current;
      if (!id) {
        stopPolling();
        return;
      }
      try {
        const res = await fetch(`/api/opencode/sessions/${id}/messages`);
        if (!res.ok) return;
        if (sessionRef.current !== id) return;
        const data = await res.json();
        const rawList: any[] = Array.isArray(data) ? data : data.messages || [];
        const msgs: ChatMessage[] = rawList.map(transformApiMessage);
        setMessages(msgs);
      } catch {
        // polling error, retry next tick
      }
    }, 2000);
  }, [stopPolling]);

  // ── Bootstrap: initial load + SSE connection ────────────────────

  useEffect(() => {
    sseRef.current?.close();
    sseRef.current = null;
    stopPolling();

    if (!sessionId) {
      setMessages([]);
      setIsStreaming(false);
      setSessionStatus(null);
      statusRef.current = null;
      setIsLoading(false);
      setError(null);
      return;
    }

    streamingMsgIdsRef.current.clear();
    skipMsgIdsRef.current.clear();
    setIsStreaming(false);
    setSessionStatus(null);
    statusRef.current = null;
    setError(null);
    setIsLoading(true);

    // Initial load from API
    fetch(`/api/opencode/sessions/${sessionId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (sessionRef.current !== sessionId) return;
        const rawList: any[] = Array.isArray(data) ? data : data.messages || [];
        setMessages(rawList.map(transformApiMessage));
        // If messages exist and no SSE status yet, assume idle
        if (rawList.length > 0 && statusRef.current === null) {
          setSessionStatus("idle");
          statusRef.current = "idle";
        }
      })
      .catch(() => {})
      .finally(() => {
        if (sessionRef.current === sessionId) setIsLoading(false);
      });

    // Open SSE
    const es = new EventSource(
      `${window.location.origin}/api/opencode/sessions/${sessionId}/events`,
    );
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        const props = ev.properties || {};

        // ── Delta events ──────────────────────────────────────
        if (ev.type === "message.part.delta") {
          if (props.field === "text" && typeof props.delta === "string") {
            const msgId = props.messageID || "unknown";
            if (skipMsgIdsRef.current.has(msgId)) return;
            if (
              !streamingMsgIdsRef.current.has(msgId) &&
              props.delta.startsWith("Before doing anything else")
            ) {
              skipMsgIdsRef.current.add(msgId);
              return;
            }
            streamingMsgIdsRef.current.add(msgId);
            stopPolling();
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m._msgId === msgId);
              if (idx !== -1) {
                return prev.map((m, i) =>
                  i === idx ? { ...m, content: m.content + props.delta } : m,
                );
              }
              return [
                ...prev,
                {
                  role: "assistant" as const,
                  content: props.delta,
                  _tools: [],
                  _reasoning: null,
                  _msgId: msgId,
                  _streaming: true,
                },
              ];
            });
          }
          return;
        }

        // ── Part updated ──────────────────────────────────────
        if (ev.type === "message.part.updated") {
          const part = props.part;
          const msgId = (part?.messageID || props.sessionID || "") as string;
          if (!msgId) return;

          if (part?.type === "text" && typeof part.text === "string") {
            if (skipMsgIdsRef.current.has(msgId)) return;
            if (
              !streamingMsgIdsRef.current.has(msgId) &&
              part.text.startsWith("Before doing anything else")
            ) {
              skipMsgIdsRef.current.add(msgId);
              return;
            }
            streamingMsgIdsRef.current.add(msgId);
            stopPolling();
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m._msgId === msgId);
              if (idx !== -1) {
                return prev.map((m, i) =>
                  i === idx ? { ...m, content: part.text } : m,
                );
              }
              return [
                ...prev,
                {
                  role: "assistant" as const,
                  content: part.text,
                  _tools: [],
                  _reasoning: null,
                  _msgId: msgId,
                  _streaming: true,
                },
              ];
            });
          } else if (part?.type === "tool") {
            const state = part.state || {};
            const chip: ToolChip = {
              name: part.tool || "tool",
              title: state.title || undefined,
              status: state.status || "unknown",
            };
            streamingMsgIdsRef.current.add(msgId);
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m._msgId === msgId);
              const addOrReplace = (tools: ToolChip[], c: ToolChip) => {
                const existing = tools.findIndex((t) => t.name === c.name);
                if (existing !== -1) {
                  const next = [...tools];
                  next[existing] = c;
                  return next;
                }
                return [...tools, c];
              };
              if (idx !== -1) {
                return prev.map((m, i) =>
                  i === idx
                    ? { ...m, _tools: addOrReplace(m._tools, chip) }
                    : m,
                );
              }
              return [
                ...prev,
                {
                  role: "assistant" as const,
                  content: "",
                  _tools: [chip],
                  _reasoning: null,
                  _msgId: msgId,
                  _streaming: true,
                },
              ];
            });
          } else if (part?.type === "reasoning") {
            streamingMsgIdsRef.current.add(msgId);
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m._msgId === msgId);
              if (idx !== -1) {
                return prev.map((m, i) =>
                  i === idx ? { ...m, _reasoning: part.text || null } : m,
                );
              }
              return [
                ...prev,
                {
                  role: "assistant" as const,
                  content: "",
                  _tools: [],
                  _reasoning: part.text || null,
                  _msgId: msgId,
                  _streaming: true,
                },
              ];
            });
          }
          return;
        }

        // ── Session status ────────────────────────────────────
        if (ev.type === "session.status") {
          const statusType = props.status?.type;
          if (statusType === "busy") {
            streamingMsgIdsRef.current.clear();
            skipMsgIdsRef.current.clear();
            setIsStreaming(true);
            setSessionStatus("busy");
            statusRef.current = "busy";
            stopPolling();
          }
          return;
        }

        // ── Session complete ──────────────────────────────────
        if (ev.type === "session.idle" || ev.type === "session.error") {
          stopPolling();
          streamingMsgIdsRef.current.clear();
          skipMsgIdsRef.current.clear();
          setIsStreaming(false);
          setSessionStatus(ev.type === "session.idle" ? "idle" : "error");
          statusRef.current = ev.type === "session.idle" ? "idle" : "error";
          setMessages((prev) =>
            prev.map((m) => {
              const { _streaming, ...rest } = m;
              return rest as ChatMessage;
            }),
          );
          if (ev.type === "session.error") {
            setError(
              ev.properties?.error?.data?.message ||
                (ev.properties?.error?.message as string) ||
                "Session error",
            );
          }
          return;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      sseRef.current = null;
      setTimeout(() => {
        if (sessionRef.current === sessionId) {
          startPolling();
        }
      }, 5000);
    };

    return () => {
      es.close();
      sseRef.current = null;
      stopPolling();
    };
  }, [sessionId, stopPolling, startPolling]);

  // ── Public actions ───────────────────────────────────────────────

  const addUserMessage = useCallback((content: string) => {
    streamingMsgIdsRef.current.clear();
    skipMsgIdsRef.current.clear();
    statusRef.current = null;
    setError(null);
    setMessages((prev) => [
      ...prev,
      { role: "user" as const, content, _tools: [], _reasoning: null },
    ]);
  }, []);

  return {
    messages,
    isStreaming,
    sessionStatus,
    isLoading,
    error,
    addUserMessage,
  };
}

// ── API message → ChatMessage transformer (shared with page) ──────

function transformApiMessage(msg: any): ChatMessage {
  const parts: any[] = msg.parts || [];
  const textParts = parts.filter((p: any) => p.type === "text");
  const toolParts = parts.filter((p: any) => p.type === "tool");
  const reasoningParts = parts.filter((p: any) => p.type === "reasoning");
  return {
    role: msg.role === "user" ? "user" : "assistant",
    content: textParts.map((p: any) => p.display || p.text || "").join("\n"),
    _tools: toolParts.map((p: any) => ({
      name: p.display?.match(/\[Tool: (\w+)\]/)?.[1] || "tool",
      title: p.display?.replace(/\[Tool: \w+\]\s*/, "") || undefined,
      status: p.detail ? "completed" : "running",
    })),
    _reasoning:
      reasoningParts.map((p: any) => p.display || p.text || "").join("\n") ||
      null,
  };
}
