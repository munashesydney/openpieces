"use client";

import { Button } from "@/components/basic/buttons/button";
import { Modal } from "../ui/modal";

export function ServiceDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  serviceTitle,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceTitle: string;
  isPending?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      danger
      title="Delete piece?"
      description="Review the impact before continuing."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete piece"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          You are about to permanently delete <span className="font-semibold">&quot;{serviceTitle}&quot;</span>.
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What will be deleted
          </p>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>- The service configuration and metadata</li>
            <li>- All endpoints linked to this service</li>
            <li>- Service runtime association for this workspace</li>
          </ul>
        </div>
        <p className="text-xs text-[var(--muted)]">
          This action is irreversible and cannot be recovered later.
        </p>
      </div>
    </Modal>
  );
}
