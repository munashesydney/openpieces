"use client";

import { Button } from "@/components/basic/buttons/button";
import { Modal } from "../ui/modal";

export function SecretDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  secretKey,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  secretKey: string;
  isPending?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      danger
      title="Delete secret?"
      description="Review the impact before continuing."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete secret"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          You are about to permanently delete <span className="font-semibold">&quot;{secretKey}&quot;</span>.
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What will be affected
          </p>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>- The secret value will be removed from this workspace</li>
            <li>- Workflows/services depending on it may fail until replaced</li>
          </ul>
        </div>
        <p className="text-xs text-[var(--muted)]">
          This action is irreversible and cannot be recovered later.
        </p>
      </div>
    </Modal>
  );
}
