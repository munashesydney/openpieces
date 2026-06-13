"use client";

import { startTransition, useState } from "react";
import {
  Network,
  Copy,
  Trash2,
  Plus,
  Check,
  Power,
} from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { WebhookCreateSheet } from "@/components/developers/webhook-create-sheet";
import {
  createWebhookAction,
  deleteWebhookAction,
  toggleWebhookAction,
} from "./actions";
import type { WebhookRow } from "@/lib/db/schema";

const AVAILABLE_EVENTS = [
  "chat.created",
  "chat.deleted",
  "message.created",
  "message.completed",
  "message.error",
  "tool.called",
];

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

export function WebhooksClient({
  initialWebhooks,
  workspaceId,
}: {
  initialWebhooks: WebhookRow[];
  workspaceId: string;
}) {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(initialWebhooks);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleDelete = (webhookId: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
    startTransition(async () => {
      await deleteWebhookAction(workspaceId, webhookId);
    });
  };

  const handleToggle = (webhookId: string, currentActive: boolean) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === webhookId ? { ...w, isActive: !currentActive } : w))
    );
    startTransition(async () => {
      await toggleWebhookAction(workspaceId, webhookId, !currentActive);
    });
  };

  const handleCreate = (formData: FormData) => {
    setCreating(true);
    setError("");
    startTransition(async () => {
      const result = await createWebhookAction(workspaceId, formData);
      setCreating(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.webhook && result.secret) {
        setCreatedSecret(result.secret);
        setWebhooks((prev) => [...prev, result.webhook]);
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
              Webhooks
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Receive HTTP callbacks when events occur in your workspace.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            className="mt-8"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={12} />
            Add Webhook
          </Button>
        </div>

        <WebhookCreateSheet
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

          {/* Webhooks list */}
          {webhooks.length === 0 && !createdSecret ? (
            <div className="flex flex-col items-center gap-2 rounded border border-dashed border-[var(--border)] py-12 text-center">
              <Network className="h-6 w-6 text-[var(--muted)]/40" />
              <p className="text-[13px] text-[var(--muted)]">
                No webhooks configured yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={12} />
                Add your first webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} className={!webhook.isActive ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--hover-bg)] text-[var(--muted)]">
                            <Network size={13} />
                          </span>
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">
                            {webhook.url}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {webhook.events.map((ev) => (
                            <span key={ev} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--hover-bg-strong)] text-[var(--muted)]">
                              {ev}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]/60">
                          <span>
                            Created{" "}
                            <span className="text-[var(--muted)]/80">
                              {formatDate(webhook.createdAt)}
                            </span>
                          </span>
                          <span className="text-[var(--border)]">/</span>
                          <span className="flex items-center gap-1">
                            Status: 
                            <span className={webhook.isActive ? "text-emerald-400" : "text-amber-400"}>
                              {webhook.isActive ? "Active" : "Inactive"}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(webhook.id, webhook.isActive)}
                          className="rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                          aria-label={webhook.isActive ? "Disable webhook" : "Enable webhook"}
                          title={webhook.isActive ? "Disable" : "Enable"}
                        >
                          <Power size={13} className={webhook.isActive ? "text-emerald-400" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(webhook.id)}
                          className="rounded p-1.5 text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Delete webhook"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Created secret modal */}
        <Modal
          isOpen={createdSecret !== null}
          onClose={() => setCreatedSecret(null)}
          title="Webhook Created"
          description="Copy your webhook secret now — it won't be shown again."
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (createdSecret) navigator.clipboard.writeText(createdSecret);
                  setCopiedKey("_created");
                  setTimeout(() => setCopiedKey(null), 2000);
                }}
              >
                {copiedKey === "_created" ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} />
                )}
                Copy Secret
              </Button>
              <Button size="sm" onClick={() => setCreatedSecret(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--muted)]">
              Use this secret to verify incoming webhook payloads using the <code className="text-[var(--accent)] bg-[var(--hover-bg)] px-1 py-0.5 rounded">X-OP-Signature</code> header (HMAC SHA-256).
            </p>
            <code className="block w-full break-all rounded bg-black/30 px-3 py-2.5 font-mono text-[12px] text-[var(--foreground)]">
              {createdSecret}
            </code>
          </div>
        </Modal>
      </div>
    </div>
  );
}
