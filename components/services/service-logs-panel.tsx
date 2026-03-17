"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, TerminalSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const MAX_LOG_CHARS = 60_000;

function appendChunk(previous: string, next: string): string {
  const combined = `${previous}${next}`;
  return combined.length > MAX_LOG_CHARS ? combined.slice(-MAX_LOG_CHARS) : combined;
}

export function ServiceLogsPanel({
  workspaceId,
  serviceId,
}: {
  workspaceId: string;
  serviceId: string;
}) {
  const [logText, setLogText] = useState("");
  const [status, setStatus] = useState<"connecting" | "live" | "disconnected">("connecting");
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = `/api/services/${serviceId}/logs?workspaceId=${encodeURIComponent(workspaceId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    setStatus("connecting");
    setLogText("");

    eventSource.onopen = () => {
      setStatus("live");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string; content?: string };
        if (data.type === "snapshot") {
          setLogText(data.content ?? "");
          return;
        }

        if (data.type === "chunk" && data.content) {
          setLogText((current) => appendChunk(current, data.content ?? ""));
        }
      } catch {
        setStatus("disconnected");
      }
    };

    eventSource.onerror = () => {
      setStatus("disconnected");
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [serviceId, workspaceId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [logText]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-5 w-5 text-[var(--muted)]" />
            <CardTitle>Runtime Logs</CardTitle>
          </div>
          <CardDescription>Live output from the spawned Deno service process.</CardDescription>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
          <Activity className={`h-3.5 w-3.5 ${status === "live" ? "text-emerald-500" : "text-[var(--muted)]"}`} />
          <span>{status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Disconnected"}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="max-h-[360px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-4 font-mono text-xs leading-6 text-[var(--foreground)]"
        >
          {logText ? (
            <pre className="whitespace-pre-wrap break-words">{logText}</pre>
          ) : (
            <p className="text-[var(--muted)]">No logs yet. Launch the service to begin streaming output.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
