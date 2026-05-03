"use client";

import {
  ExternalLink,
  Power,
  PlugZap,
  Loader2,
  RefreshCw,
  KeyRound,
} from "lucide-react";
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
  const [clientIdConfigured, setClientIdConfigured] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const status = await getHubConnectionStatus();
    setConnected(status.connected);
    setHubUrl(status.hubUrl);
    setEmail(status.email);
    setName(status.name);
    setClientIdConfigured(status.clientIdConfigured);
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
      {/* Setup prompt when client ID is missing */}
      {!clientIdConfigured && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <KeyRound size={16} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-amber-300/90">
                Hub API key not configured
              </h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-amber-200/60">
                To connect to the OpenPieces Hub, generate an API key on{" "}
                <a
                  href="https://openpieces.com/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300/80 underline underline-offset-2 hover:text-amber-200"
                >
                  openpieces.com/profile
                </a>{" "}
                and set it in your{" "}
                <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                  .env
                </code>
                :
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-3 font-mono text-[11px] text-amber-200/70">
                OPENPIECES_HUB_CLIENT_ID=op_your_generated_key_here
              </pre>
              <p className="mt-2 text-[11px] text-amber-200/50">
                Restart the server after updating the environment variable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection status card */}
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
          {clientIdConfigured && connected ? (
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
          ) : clientIdConfigured ? (
            <button
              onClick={handleReconnect}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[11px] font-medium text-white transition-colors hover:opacity-90"
            >
              <PlugZap size={12} />
              Connect to Hub
            </button>
          ) : null}
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
