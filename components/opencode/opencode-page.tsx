"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Plus, Terminal, FolderOpen, X } from "lucide-react";
import { Dropdown } from "@/components/basic/input/dropdown";
import { OpenCodePageSkeleton } from "@/components/opencode/opencode-page-skeleton";
import {
  OpenCodeMessageCard,
  type ChatMessage,
  type ToolChip,
} from "@/components/opencode/opencode-message-card";
import type { Service } from "@/lib/db/schema";
import { serviceDirectoryLabel } from "@/lib/utils/service-directory-label";

type SessionEvent = {
  type: string;
  sessionId?: string;
  [key: string]: unknown;
};

export function OpenCodePage({
  workspaceId,
  services,
}: {
  workspaceId: string;
  services: Service[];
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  /** Initial / refresh of session list (page 1) */
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  /** Loading messages for the selected session */
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedSessionDirectory, setSelectedSessionDirectory] = useState<
    string | null
  >(null);
  const [selectedSessionStatus, setSelectedSessionStatus] = useState<
    string | null
  >(null);
  const [selectedSessionLastMessage, setSelectedSessionLastMessage] = useState<
    string | null
  >(null);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isAborting, setIsAborting] = useState(false);
  const [showSessions, setShowSessions] = useState(true);
  const streamingMsgIdsRef = useRef<Set<string>>(new Set());
  const lastStreamingMsgRef = useRef<string | null>(null);
  const skipMsgIdsRef = useRef<Set<string>>(new Set());

  const showSessionsPanel = showSessions || !selectedSessionId;

  const servicesWithDirectory = services.filter(
    (s) =>
      s.directory &&
      typeof s.directory === "string" &&
      s.directory.trim() !== "",
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionSseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadMessages(selectedSessionId);
      fetch(`/api/opencode/sessions/${selectedSessionId}/directory`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSelectedSessionDirectory(data?.directory ?? null))
        .catch(() => setSelectedSessionDirectory(null));
      // Grab status + lastMessage from the sessions list
      const session = sessions.find(
        (s) => (s.sessionId || s.session_id || s.id) === selectedSessionId,
      );
      setSelectedSessionStatus(session?.status ?? null);
      setSelectedSessionLastMessage(session?.lastMessage ?? null);
    } else {
      setMessages([]);
      setSelectedSessionDirectory(null);
      setSelectedSessionStatus(null);
      setSelectedSessionLastMessage(null);
    }
    // Note: intentionally NOT depending on `sessions` — we don't want to
    // close/recreate SSE whenever sessions list refreshes after a send.
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      sessionSseRef.current?.close();
      sessionSseRef.current = null;
    };
  }, []);

  // Persistent SSE for the selected session — SSE fallback polling on error.
  // by different processes. We use polling as a fallback when SSE fails.
  useEffect(() => {
    if (!selectedSessionId) {
      sessionSseRef.current?.close();
      sessionSseRef.current = null;
      return;
    }

    sessionSseRef.current?.close();
    const es = new EventSource(
      `${window.location.origin}/api/opencode/sessions/${selectedSessionId}/events`,
    );
    sessionSseRef.current = es;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPolling = () => {
      if (pollInterval) return; // Already polling
      console.log(
        "[SSE] SSE failed, starting polling fallback for",
        selectedSessionId,
      );
      stopPolling();
      pollInterval = setInterval(async () => {
        if (!selectedSessionId) {
          stopPolling();
          return;
        }
        // Check if session is still busy via selectedSessionStatus (DB-driven)
        if (selectedSessionStatus !== "busy") {
          stopPolling();
          await loadMessages(selectedSessionId);
          await loadSessions();
          return;
        }
        // Poll for new messages while waiting
        await loadMessages(selectedSessionId);
      }, 2000);
    };

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as SessionEvent;
        const props = (ev as any).properties || {};

        // ── Streaming: delta events — build messages progressively ─
        if (ev.type === "message.part.delta") {
          if (props.field === "text" && typeof props.delta === "string") {
            const msgId = (props.messageID as string) || "unknown";
            if (skipMsgIdsRef.current.has(msgId)) return;
            if (
              !streamingMsgIdsRef.current.has(msgId) &&
              props.delta.startsWith("Before doing anything else")
            ) {
              skipMsgIdsRef.current.add(msgId);
              return;
            }
            streamingMsgIdsRef.current.add(msgId);
            lastStreamingMsgRef.current = msgId;
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
                } satisfies ChatMessage,
              ];
            });
            stopPolling();
          }
          return;
        }

        // ── Streaming: part updated — text, tool, reasoning, steps ─
        if (ev.type === "message.part.updated") {
          const part = props.part;
          const msgId =
            (part?.messageID as string) || (props.sessionID as string) || "";
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
            lastStreamingMsgRef.current = msgId;
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
                } satisfies ChatMessage,
              ];
            });
            stopPolling();
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
              if (idx !== -1) {
                return prev.map((m, i) =>
                  i === idx ? { ...m, _tools: [...m._tools, chip] } : m,
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
                } satisfies ChatMessage,
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
                } satisfies ChatMessage,
              ];
            });
          } else if (
            part?.type === "step-start" ||
            part?.type === "step-finish"
          ) {
            const label =
              part.type === "step-start" ? "Step Start" : "Step Finish";
            streamingMsgIdsRef.current.add(msgId);
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m._msgId === msgId);
              if (idx !== -1) {
                return prev.map((m, i) =>
                  i === idx
                    ? {
                        ...m,
                        _tools: [
                          ...m._tools,
                          { name: label, status: "completed" },
                        ],
                      }
                    : m,
                );
              }
              return [
                ...prev,
                {
                  role: "assistant" as const,
                  content: "",
                  _tools: [{ name: label, status: "completed" }],
                  _reasoning: null,
                  _msgId: msgId,
                  _streaming: true,
                } satisfies ChatMessage,
              ];
            });
          }
          return;
        }

        // ── Session became busy — clear streaming state ──────────
        if (ev.type === "session.status") {
          const statusType = props.status?.type;
          if (statusType === "busy") {
            streamingMsgIdsRef.current.clear();
            skipMsgIdsRef.current.clear();
            lastStreamingMsgRef.current = null;
            setIsSending(true);
            stopPolling();
          }
        }

        // ── Session complete — keep streaming messages, strip flags ─
        if (ev.type === "session.idle" || ev.type === "session.error") {
          stopPolling();
          const newStatus = ev.type === "session.idle" ? "idle" : "error";
          streamingMsgIdsRef.current.clear();
          skipMsgIdsRef.current.clear();
          lastStreamingMsgRef.current = null;
          setIsSending(false);
          setSelectedSessionStatus(newStatus);
          setSessions((prev) =>
            prev.map((s) =>
              (s.sessionId || s.session_id || s.id) === selectedSessionId
                ? { ...s, status: newStatus }
                : s,
            ),
          );
          setMessages((prev) =>
            prev.map((m) => {
              const { _streaming, ...rest } = m;
              return rest as ChatMessage;
            }),
          );
          loadSessions();
          return;
        }
      } catch (err) {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      sessionSseRef.current = null;
      // Don't poll immediately - SSE might recover
      // Only start polling if the session is still "busy" (DB is source of truth)
      setTimeout(() => {
        if (selectedSessionStatus === "busy" && selectedSessionId) {
          startPolling();
        }
      }, 5000);
    };

    return () => {
      es.close();
      sessionSseRef.current = null;
      stopPolling();
    };
  }, [selectedSessionId, selectedSessionStatus]);

  const loadSessions = async (page = 1, append = false) => {
    try {
      if (page === 1) setIsSessionsLoading(true);
      else setIsLoadingMore(true);
      const res = await fetch(
        `/api/opencode/sessions?workspaceId=${workspaceId}&page=${page}&pageSize=20`,
      );
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load sessions:", data);
        return;
      }
      const sessionsList = Array.isArray(data.sessions) ? data.sessions : [];
      if (append) {
        setSessions((prev) => [...prev, ...sessionsList]);
      } else {
        setSessions(sessionsList);
      }
      setSessionsHasMore(data.hasMore ?? false);
      setSessionsPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSessionsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreSessions = () => {
    if (sessionsHasMore && !isLoadingMore) {
      loadSessions(sessionsPage + 1, true);
    }
  };

  const openCreateModal = () => {
    setSelectedServiceId("");
    setShowCreateModal(true);
  };

  const createSession = async () => {
    if (!selectedServiceId) return;
    try {
      setIsCreatingSession(true);
      const res = await fetch("/api/opencode/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: selectedServiceId, workspaceId }),
      });
      if (res.ok) {
        const newSession = await res.json();
        const id = newSession.session_id || newSession.id;
        setSelectedSessionId(id);
        setShowCreateModal(false);
        setSelectedServiceId("");
        await loadSessions();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to create session", err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const loadMessages = async (id: string) => {
    if (id !== selectedSessionId) return;
    try {
      setIsMessagesLoading(true);
      const res = await fetch(`/api/opencode/sessions/${id}/messages`);
      if (!res.ok) return;
      if (id !== selectedSessionId) return;
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : data.messages || [];
      const transformed: ChatMessage[] = rawList.map((msg: any) => {
        const parts: any[] = msg.parts || [];
        const textParts = parts.filter((p: any) => p.type === "text");
        const toolParts = parts.filter((p: any) => p.type === "tool");
        const reasoningParts = parts.filter((p: any) => p.type === "reasoning");
        return {
          role: msg.role === "user" ? "user" : "assistant",
          content: textParts
            .map((p: any) => p.display || p.text || "")
            .join("\n"),
          _tools: toolParts.map((p: any) => ({
            name: p.display?.match(/\[Tool: (\w+)\]/)?.[1] || "tool",
            title: p.display?.replace(/\[Tool: \w+\]\s*/, "") || undefined,
            status: p.detail ? "completed" : "running",
          })),
          _reasoning:
            reasoningParts
              .map((p: any) => p.display || p.text || "")
              .join("\n") || null,
        };
      });
      setMessages(transformed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedSessionId) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      _tools: [],
      _reasoning: null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    streamingMsgIdsRef.current.clear();
    skipMsgIdsRef.current.clear();
    lastStreamingMsgRef.current = null;

    // Update status immediately in UI
    setSelectedSessionStatus("busy");
    setSessions((prev) =>
      prev.map((s) =>
        (s.sessionId || s.session_id || s.id) === selectedSessionId
          ? { ...s, status: "busy" }
          : s,
      ),
    );

    try {
      const res = await fetch(
        `/api/opencode/sessions/${selectedSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userMessage.content }),
        },
      );

      if (res.status === 202) {
        // SSE is already connected via persistent useEffect - just wait for completion
        // No need to call connectEventStream here
        setSendError(null);
      } else if (res.ok) {
        await loadMessages(selectedSessionId);
        setIsSending(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to send message", errData);
        setSendError(errData.error || "Failed to send message");
        setIsSending(false);
        setSelectedSessionStatus("idle");
        setSessions((prev) =>
          prev.map((s) =>
            (s.sessionId || s.session_id || s.id) === selectedSessionId
              ? { ...s, status: "idle" }
              : s,
          ),
        );
      }
    } catch (e) {
      console.error(e);
      setSendError("Failed to send message. Please try again.");
      setIsSending(false);
      setSelectedSessionStatus("idle");
      setSessions((prev) =>
        prev.map((s) =>
          (s.sessionId || s.session_id || s.id) === selectedSessionId
            ? { ...s, status: "idle" }
            : s,
        ),
      );
    }
  };

  const abortSession = async () => {
    if (!selectedSessionId) return;

    setIsAborting(true);
    try {
      const res = await fetch(
        `/api/opencode/sessions/${selectedSessionId}/abort`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        setSelectedSessionStatus("error");
        setSessions((prev) =>
          prev.map((s) =>
            (s.sessionId || s.session_id || s.id) === selectedSessionId
              ? { ...s, status: "error" }
              : s,
          ),
        );
        setIsSending(false);
        await loadMessages(selectedSessionId);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to abort session", errData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAborting(false);
    }
  };

  if (isSessionsLoading && sessions.length === 0) {
    return <OpenCodePageSkeleton />;
  }

  return (
    <div className="flex h-full text-sm">
      {/* Sidebar: Sessions — mobile: full width, desktop: 256px side-by-side */}
      <div
        className={`${
          showSessionsPanel ? "flex" : "hidden"
        } w-full lg:w-64 shrink-0 border-r border-[var(--border)] bg-[var(--background)] flex-col h-full lg:flex`}
      >
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Sessions
          </h2>
          <button
            onClick={openCreateModal}
            disabled={isCreatingSession}
            className="p-1.5 hover:bg-[var(--hover-bg)] rounded-md transition-colors"
            title="New Session"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" /> New session
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 hover:bg-[var(--hover-bg)] rounded-md transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Select a service with a directory. The session will use that
                directory for OpenCode.
              </p>
              {servicesWithDirectory.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-500 py-2">
                  No services with a directory set. Create a service and set its
                  directory first.
                </p>
              ) : (
                <Dropdown
                  label="Service"
                  value={selectedServiceId}
                  onChange={setSelectedServiceId}
                  options={[
                    { label: "Select a service...", value: "" },
                    ...servicesWithDirectory.map((s) => ({
                      label: `${s.title} (${serviceDirectoryLabel(s.directory!)})`,
                      value: s.id,
                    })),
                  ]}
                />
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createSession}
                  disabled={
                    !selectedServiceId ||
                    isCreatingSession ||
                    servicesWithDirectory.length === 0
                  }
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isCreatingSession ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 && !isSessionsLoading && (
            <div className="text-[var(--muted)] text-center mt-4">
              No sessions found
            </div>
          )}
          {sessions.map((session) => {
            // Handle different possible ID formats returned by API
            const id = session.sessionId || session.session_id || session.id;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedSessionId(id);
                  setShowSessions(false);
                }}
                className={`w-full text-left p-3 rounded-md mb-1 transition-colors truncate ${
                  selectedSessionId === id
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-[var(--hover-bg)] text-[var(--foreground)]"
                }`}
              >
                {id}
              </button>
            );
          })}
          {sessionsHasMore && (
            <button
              onClick={loadMoreSessions}
              disabled={isLoadingMore}
              className="w-full text-center p-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {isLoadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
              ) : null}
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-full bg-[var(--background)] relative ${
          selectedSessionId && !showSessions ? "" : "hidden lg:flex"
        }`}
      >
        {!selectedSessionId ? (
          <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--muted)]">
            Select or create a session to start coding
          </div>
        ) : (
          <>
            {/* Mobile back button + directory bar */}
            {(selectedSessionDirectory || selectedSessionStatus) && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--hover-bg)]/50 min-w-0">
                <button
                  onClick={() => {
                    setShowSessions(true);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] lg:hidden"
                  aria-label="Back to sessions"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5 8.25 12l7.5-7.5"
                    />
                  </svg>
                </button>
                <div className="flex items-center gap-3 text-xs text-[var(--muted)] min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 shrink-0">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  </span>
                  <span
                    className="truncate min-w-0"
                    title={selectedSessionDirectory ?? ""}
                  >
                    {selectedSessionDirectory}
                  </span>
                  {selectedSessionStatus && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        selectedSessionStatus === "idle"
                          ? "bg-green-500/20 text-green-400"
                          : selectedSessionStatus === "busy"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : selectedSessionStatus === "error"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {selectedSessionStatus}
                    </span>
                  )}
                  {selectedSessionStatus && (
                    <button
                      onClick={abortSession}
                      disabled={isAborting}
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      title="Abort session"
                    >
                      {isAborting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      Abort
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {isMessagesLoading && messages.length === 0 ? (
                <div
                  className="space-y-6 animate-pulse"
                  aria-busy={true}
                  aria-label="Loading messages"
                >
                  <div className="flex justify-end">
                    <div className="h-16 w-[min(72%,320px)] rounded-xl bg-[var(--hover-bg)]" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-24 w-[min(85%,420px)] rounded-xl bg-[var(--hover-bg)]" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-12 w-[min(55%,240px)] rounded-xl bg-[var(--hover-bg)]" />
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <OpenCodeMessageCard
                      key={i}
                      message={msg}
                      isSending={isSending}
                      isLast={i === messages.length - 1}
                    />
                  ))}
                  {isSending &&
                    lastStreamingMsgRef.current === null &&
                    messages.length > 0 && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)]">
                          <div className="flex items-center gap-2 text-[var(--muted)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {sendError && (
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mx-4 mb-2">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {sendError}
                </p>
              </div>
            )}

            <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-end gap-2 max-w-4xl mx-auto relative">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setSendError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask OpenCode to build something..."
                  className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  rows={2}
                  disabled={isSending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isSending}
                  className="p-3 bg-[var(--accent)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
