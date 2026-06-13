"use client";

import { startTransition, useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ApiKeyCreateSheet } from "@/components/developers/api-key-create-sheet";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  revealApiKeyAction,
} from "./actions";
import type { ApiKey } from "@/lib/services/api-key.service";

function formatDate(date: string | Date | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatLastUsed(date: string | Date | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(date);
}

export function ApiKeysClient({
  initialKeys,
  workspaceId,
}: {
  initialKeys: ApiKey[];
  workspaceId: string;
}) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [revealedKeys, setRevealedKeys] = useState<Map<string, string>>(
    new Map(),
  );
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const toggleKeyVisibility = async (keyId: string) => {
    const currentlyVisible = visibleKeys.has(keyId);

    if (currentlyVisible) {
      setVisibleKeys((prev) => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
      return;
    }

    if (revealedKeys.has(keyId)) {
      setVisibleKeys((prev) => new Set(prev).add(keyId));
      return;
    }

    setRevealedKeys((prev) => {
      const next = new Map(prev);
      next.set(keyId, "");
      return next;
    });

    startTransition(async () => {
      const result = await revealApiKeyAction(workspaceId, keyId);
      if ("error" in result) {
        setError(result.error);
        setRevealedKeys((prev) => {
          const next = new Map(prev);
          next.delete(keyId);
          return next;
        });
        return;
      }
      setRevealedKeys((prev) => {
        const next = new Map(prev);
        next.set(keyId, result.plaintextKey);
        return next;
      });
      setVisibleKeys((prev) => new Set(prev).add(keyId));
    });
  };

  const copyToClipboard = async (keyId: string) => {
    const plaintext = revealedKeys.get(keyId);
    if (!plaintext) return;

    await navigator.clipboard.writeText(plaintext);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = (keyId: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
    startTransition(async () => {
      await deleteApiKeyAction(workspaceId, keyId);
    });
  };

  const handleCreate = (formData: FormData) => {
    setCreating(true);
    setError("");
    startTransition(async () => {
      const result = await createApiKeyAction(workspaceId, formData);
      setCreating(false);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      if ("plaintextKey" in result && "apiKey" in result) {
        setCreatedKey(result.plaintextKey);
        setKeys((prev) => [...prev, result.apiKey]);
      }
      setShowCreateForm(false);
    });
  };

  return (
    <div className="flex w-full px-6 pb-20 pt-8">
      <div className="w-full max-w-[820px] px-4 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
              Developer
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              API
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              API keys used to authenticate requests to your workspace.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            className="mt-8"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={12} />
            Create Key
          </Button>
        </div>

        <ApiKeyCreateSheet
          isOpen={showCreateForm}
          onClose={() => {
            setShowCreateForm(false);
            setError("");
          }}
          action={handleCreate}
          formError={error || null}
          isPending={creating}
        />

        <div className="space-y-4">

          {/* Keys list */}
          {keys.length === 0 && !createdKey ? (
            <div className="flex flex-col items-center gap-2 rounded border border-dashed border-[var(--border)] py-12 text-center">
              <KeyRound className="h-6 w-6 text-[var(--muted)]/40" />
              <p className="text-[13px] text-[var(--muted)]">
                No API keys created yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={12} />
                Create your first key
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((apiKey) => {
                const isVisible = visibleKeys.has(apiKey.id);
                const plaintext = revealedKeys.get(apiKey.id);
                const isLoading = isVisible && !plaintext;
                const isCopied = copiedKey === apiKey.id;

                return (
                  <Card key={apiKey.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--hover-bg)] text-[var(--muted)]">
                              <KeyRound size={13} />
                            </span>
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {apiKey.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <code className="block w-full truncate rounded bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-[var(--muted)]">
                              {isVisible && plaintext
                                ? plaintext
                                : isLoading
                                  ? "Decrypting..."
                                  : `${apiKey.keyPrefix}...${apiKey.keySuffix}`}
                            </code>
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                              className="shrink-0 rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                              aria-label={isVisible ? "Hide key" : "Show key"}
                              disabled={isLoading}
                            >
                              {isVisible ? (
                                <EyeOff size={13} />
                              ) : (
                                <Eye size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(apiKey.id)}
                              className="shrink-0 rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                              aria-label="Copy key"
                              disabled={!isVisible || !plaintext}
                            >
                              {isCopied ? (
                                <Check size={13} className="text-emerald-400" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(apiKey.id)}
                              className="shrink-0 rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                              aria-label="Revoke key"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]/60">
                            <span>
                              Created{" "}
                              <span className="text-[var(--muted)]/80">
                                {formatDate(apiKey.createdAt)}
                              </span>
                            </span>
                            <span className="text-[var(--border)]">/</span>
                            <span>
                              Last used{" "}
                              <span className="text-[var(--muted)]/80">
                                {formatLastUsed(apiKey.lastUsedAt)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* API docs link */}
          <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--hover-bg)] text-[var(--muted)]">
                  <ExternalLink size={14} />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    API Documentation
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    Full API reference for integrating with OpenPieces.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open("https://openpieces.com/docs", "_blank")
                }
              >
                <ExternalLink size={12} />
                Open Docs
              </Button>
            </div>
          </div>
        </div>

        {/* Created key modal */}
        <Modal
          isOpen={createdKey !== null}
          onClose={() => setCreatedKey(null)}
          title="API Key Created"
          description="Copy your key now — it won't be shown again."
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (createdKey) navigator.clipboard.writeText(createdKey);
                  setCopiedKey("_created");
                  setTimeout(() => setCopiedKey(null), 2000);
                }}
              >
                {copiedKey === "_created" ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} />
                )}
                Copy Key
              </Button>
              <Button size="sm" onClick={() => setCreatedKey(null)}>
                Done
              </Button>
            </div>
          }
        >
          <p className="text-[12px] text-[var(--muted)] mb-3">
            This is the only time the full key is visible. Store it somewhere
            secure.
          </p>
          <code className="block w-full break-all rounded bg-black/30 px-3 py-2.5 font-mono text-[12px] text-[var(--foreground)]">
            {createdKey}
          </code>
        </Modal>
      </div>
    </div>
  );
}
