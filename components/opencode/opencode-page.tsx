"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Plus, Terminal, FolderOpen, X, Activity } from "lucide-react";
import { Dropdown } from "@/components/basic/input/dropdown";
import type { Service } from "@/lib/db/schema";

type SessionEvent = { type: string; sessionId?: string; [key: string]: unknown };

export function OpenCodePage({
  workspaceId,
  services,
}: {
  workspaceId: string;
  services: Service[];
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedSessionDirectory, setSelectedSessionDirectory] = useState<string | null>(null);

  const servicesWithDirectory = services.filter(
    (s) => s.directory && typeof s.directory === "string" && s.directory.trim() !== ""
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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
      setEvents([]);
    } else {
      setMessages([]);
      setSelectedSessionDirectory(null);
      setEvents([]);
    }
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, events]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/opencode/sessions");
      if (res.ok) {
        const data = await res.json();
        const sessionsList = Array.isArray(data) ? data : (data.sessions || []);
        setSessions(sessionsList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedServiceId("");
    setShowCreateModal(true);
  };

  const createSession = async () => {
    if (!selectedServiceId) return;
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const loadMessages = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/opencode/sessions/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        // Handle if data is an array or wrapped
        const messagesList = Array.isArray(data) ? data : (data.messages || []);
        // The API might return it top-down, let's reverse if needed, assuming they're sorted
        setMessages(messagesList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const connectEventStream = (sessionId: string) => {
    eventSourceRef.current?.close();
    setEvents([]);
    const url = `${window.location.origin}/api/opencode/sessions/${sessionId}/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as SessionEvent;
        setEvents((prev) => [...prev, ev]);
        if (ev.type === "session.idle" || ev.type === "session.error") {
          es.close();
          eventSourceRef.current = null;
          loadMessages(sessionId).finally(() => {
            setIsSending(false);
            setEvents([]);
          });
        }
      } catch (err) {
        console.error("Failed to parse event:", err);
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      loadMessages(sessionId).finally(() => {
        setIsSending(false);
        setEvents([]);
      });
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedSessionId) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/opencode/sessions/${selectedSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage.content }),
      });

      if (res.status === 202) {
        connectEventStream(selectedSessionId);
      } else if (res.ok) {
        await loadMessages(selectedSessionId);
        setIsSending(false);
      } else {
        console.error("Failed to send message", await res.text());
        setIsSending(false);
      }
    } catch (e) {
      console.error(e);
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full text-sm">
      {/* Sidebar: Sessions */}
      <div className="w-64 border-r border-[var(--border)] bg-[var(--background)] flex flex-col h-full">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Sessions
          </h2>
          <button
            onClick={openCreateModal}
            disabled={isLoading}
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
                Select a service with a directory. The session will use that directory for OpenCode.
              </p>
              {servicesWithDirectory.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-500 py-2">
                  No services with a directory set. Create a service and set its directory first.
                </p>
              ) : (
                <Dropdown
                  label="Service"
                  value={selectedServiceId}
                  onChange={setSelectedServiceId}
                  options={[
                    { label: "Select a service...", value: "" },
                    ...servicesWithDirectory.map((s) => ({
                      label: `${s.title} (${s.directory})`,
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
                  disabled={!selectedServiceId || isLoading || servicesWithDirectory.length === 0}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isLoading ? (
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
          {sessions.length === 0 && !isLoading && (
            <div className="text-[var(--muted)] text-center mt-4">No sessions found</div>
          )}
          {sessions.map((session) => {
            // Handle different possible ID formats returned by API
            const id = session.session_id || session.id;
            return (
              <button
                key={id}
                onClick={() => setSelectedSessionId(id)}
                className={`w-full text-left p-3 rounded-md mb-1 transition-colors truncate ${
                  selectedSessionId === id
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-[var(--hover-bg)] text-[var(--foreground)]"
                }`}
              >
                {id}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full bg-[var(--background)] relative">
        {!selectedSessionId ? (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
            Select or create a session to start coding
          </div>
        ) : (
          <>
            {selectedSessionDirectory && (
              <div className="px-6 py-2 border-b border-[var(--border)] bg-[var(--hover-bg)]/50 flex items-center gap-2 text-xs text-[var(--muted)]">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={selectedSessionDirectory}>
                  {selectedSessionDirectory}
                </span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {(isSending || events.length > 0) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] w-full">
                    <div className="flex items-center gap-2 mb-2 text-[var(--muted)]">
                      <Activity className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium">
                        {isSending ? "Session in progress..." : "Activity"}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                      {events.map((ev, i) => {
                        const e = ev as { input?: { tool?: string }; properties?: { status?: string } };
                        let label = ev.type;
                        if (ev.type === "tool.execute.before" && e.input?.tool)
                          label = `Running ${e.input.tool}...`;
                        else if (ev.type === "tool.execute.after" && e.input?.tool)
                          label = `Finished ${e.input.tool}`;
                        else if (ev.type === "session.status" && e.properties?.status)
                          label = String(e.properties.status);
                        else if (ev.type === "message.part.updated") label = "Updating message...";
                        return (
                          <div
                            key={i}
                            className="py-1 border-b border-[var(--border)]/50 last:border-0"
                          >
                            <span className="text-[var(--muted)]">[{ev.type}]</span> {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-end gap-2 max-w-4xl mx-auto relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
