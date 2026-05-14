"use client";

import { useState, useTransition } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Sheet } from "@/components/ui/sheet";
import type { ActionResult } from "@/app/workspace/[workspaceId]/personal/secrets/actions";
import {
  createSecretAction,
  updateSecretAction,
  deleteSecretAction,
} from "@/app/workspace/[workspaceId]/personal/secrets/actions";
import { SecretDeleteModal } from "./secret-delete-modal";

type Secret = {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

type SecretsPageProps = {
  initialSecrets: {
    id: string;
    workspaceId: string;
    userId: string;
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  workspaceId: string;
};

export function SecretsPage({ initialSecrets, workspaceId }: SecretsPageProps) {
  const [secrets, setSecrets] = useState<Secret[]>(
    initialSecrets.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  );
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [secretToDelete, setSecretToDelete] = useState<Secret | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!key || !value) return;

    setFormError(null);

    const formData = new FormData();
    formData.set("key", key);
    formData.set("value", value);

    startTransition(async () => {
      let result: ActionResult;
      if (editingId) {
        result = await updateSecretAction(workspaceId, editingId, formData);
      } else {
        result = await createSecretAction(workspaceId, formData);
      }

      if ("error" in result) {
        setFormError(result.error);
        return;
      }

      setKey("");
      setValue("");
      setEditingId(null);
      setIsSheetOpen(false);
      // Re-fetch is handled via revalidatePath; for now, update local list optimistically
      const now = new Date().toISOString();
      if (editingId) {
        setSecrets((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? {
                  ...s,
                  key,
                  value,
                  updatedAt: now,
                }
              : s,
          ),
        );
      } else {
        setSecrets((prev) => [
          {
            id: crypto.randomUUID(),
            key,
            value,
            createdAt: now,
            updatedAt: now,
          },
          ...prev,
        ]);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSecretAction(workspaceId, id);
      setSecrets((prev) => prev.filter((s) => s.id !== id));
    });
  };

  const handleConfirmDelete = () => {
    if (!secretToDelete) return;
    handleDelete(secretToDelete.id);
    setSecretToDelete(null);
  };

  const handleEdit = (secret: Secret) => {
    setEditingId(secret.id);
    setKey(secret.key);
    setValue(secret.value);
    setFormError(null);
    setIsSheetOpen(true);
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-8">
      <div className="w-full px-4 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">Security</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Secrets
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Manage environment variables used by your personal workflows and
              services.
            </p>
          </div>
          <Button
            type="button"
            className="gap-2"
            onClick={() => setIsSheetOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add secret
          </Button>
        </div>

        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Add secret"
          description="Create a new environment variable."
          footer={<></>}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Name"
              name="key"
              placeholder="e.g. OPENAI_API_KEY"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
            <Input
              label="Value"
              name="value"
              type="password"
              placeholder="••••••••••••••••••"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />

            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {formError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={isPending || !key || !value}
              >
                <Plus className="h-4 w-4" />
                {isPending
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add secret"}
              </Button>
            </div>
          </form>
        </Sheet>

        <section className="space-y-3">
          {secrets.length > 0 && (
            <div className="flex items-center justify-end">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                {secrets.length} {secrets.length === 1 ? "secret" : "secrets"}
              </span>
            </div>
          )}

          <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--background-soft)]">
            {secrets.length === 0 ? (
              <div className="rounded border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
                No secrets yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px] gap-3 bg-[var(--background)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  <span>Name</span>
                  <span>Value</span>
                  <span className="text-right">Actions</span>
                </div>
                {secrets.map((secret) => (
                  <SecretRow
                    key={secret.id}
                    secret={secret}
                    onDeleteRequest={setSecretToDelete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        <SecretDeleteModal
          isOpen={secretToDelete !== null}
          onClose={() => setSecretToDelete(null)}
          onConfirm={handleConfirmDelete}
          secretKey={secretToDelete?.key ?? ""}
          isPending={isPending}
        />
      </div>
    </div>
  );
}

function SecretRow({
  secret,
  onDeleteRequest,
  onEdit,
}: {
  secret: Secret;
  onDeleteRequest: (secret: Secret) => void;
  onEdit: (secret: Secret) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px] sm:items-center px-4 py-4 sm:py-3 text-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--foreground)]">
            {secret.key}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
          Updated {new Date(secret.updatedAt).toLocaleString()}
        </p>
      </div>
      <div className="min-w-0">
        {revealed ? (
          <span className="break-all text-[var(--foreground)]">
            {secret.value}
          </span>
        ) : (
          <span className="text-[var(--muted)]">
            {"•".repeat(Math.min(16, Math.max(4, secret.value.length)))}
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[var(--muted)]"
          onClick={() => onEdit(secret)}
          aria-label="Edit secret"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[var(--muted)]"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide value" : "Reveal value"}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[var(--muted)] hover:text-red-500"
          onClick={() => onDeleteRequest(secret)}
          aria-label="Delete secret"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
