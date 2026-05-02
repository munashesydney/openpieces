"use client";

import { ExternalLink, Power, PlugZap, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getHubConnectionStatus,
  disconnectHubAction,
  reconnectHubAction,
} from "./actions";

export default function HubSettingsPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [hubUrl, setHubUrl] = useState("");
  const [email, setEmail] = useState<string | undefined>();
  const [name, setName] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const status = await getHubConnectionStatus();
    setConnected(status.connected);
    setHubUrl(status.hubUrl);
    setEmail(status.email);
    setName(status.name);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDisconnect = async () => {
    setBusy(true);
    await disconnectHubAction();
    await refresh();
    setBusy(false);
    router.refresh();
  };

  const handleReconnect = async () => {
    const result = await reconnectHubAction(null, new FormData());
    if (result.redirectUrl) {
      router.push(result.redirectUrl);
    }
  };

  if (connected === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              connected
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/5 text-white/25"
            }`}
          >
            {connected ? <PlugZap size={18} /> : <Power size={18} />}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              OpenPieces Hub
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {connected ? "Connected and authenticated" : "Not connected"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-[12px] text-[var(--muted)]">
          {email && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-white/30">Account</span>
              <span className="truncate text-[var(--foreground)]">{email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-white/30">Hub URL</span>
            <code className="truncate rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[11px]">
              {hubUrl}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-white/30">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                connected
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/5 text-white/30"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? "bg-emerald-400" : "bg-white/20"
                }`}
              />
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-2 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Power size={12} />
              )}
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleReconnect}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[11px] font-medium text-white transition-colors hover:opacity-90"
            >
              <PlugZap size={12} />
              Connect to Hub
            </button>
          )}
          <button
            onClick={refresh}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          What the hub connection does
        </h3>
        <ul className="mt-3 space-y-2 text-[12px] text-[var(--muted)]">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-400">•</span>
            Push your services to the marketplace as reusable pieces
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-400">•</span>
            Pull community pieces into your workspace
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-400">•</span>
            Sync endpoints and required secrets
          </li>
        </ul>
      </div>
    </div>
  );
}
