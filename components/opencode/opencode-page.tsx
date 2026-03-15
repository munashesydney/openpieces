"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Plus, Terminal } from "lucide-react";

export function OpenCodePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadMessages(selectedSessionId);
    } else {
      setMessages([]);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/opencode/sessions");
      if (res.ok) {
        const data = await res.json();
        // Handle if data is directly an array or wrapped in an object
        const sessionsList = Array.isArray(data) ? data : (data.sessions || []);
        setSessions(sessionsList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/opencode/sessions", { method: "POST" });
      if (res.ok) {
        const newSession = await res.json();
        // Safely extract the session ID
        const id = newSession.session_id || newSession.id;
        setSelectedSessionId(id);
        await loadSessions();
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
      
      if (res.ok) {
        // Reload all messages to get the correct state and the assistant's reply
        await loadMessages(selectedSessionId);
      } else {
        console.error("Failed to send message", await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
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
            onClick={createSession}
            disabled={isLoading}
            className="p-1.5 hover:bg-[var(--hover-bg)] rounded-md transition-colors"
            title="New Session"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
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
              {isSending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
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
