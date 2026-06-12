"use client";

import { Button } from "@/components/basic/buttons/button";
import { Modal } from "../ui/modal";

export function ServiceArchiveModal({
  isOpen,
  onClose,
  onConfirm,
  serviceTitle,
  isRunning,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceTitle: string;
  isRunning: boolean;
  isPending?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive piece?"
      description={
        isRunning
          ? "The service will be stopped first, then archived."
          : "The service will be archived and cannot be launched."
      }
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Archiving..." : "Archive piece"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          You are about to archive{" "}
          <span className="font-semibold">&quot;{serviceTitle}&quot;</span>.
        </p>
        {isRunning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-500">
              This service is currently running. It will be stopped before
              archiving.
            </p>
          </div>
        )}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What archiving means
          </p>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>- The service will be hidden from active views</li>
            <li>- It cannot be launched or triggered while archived</li>
            <li>- You can unarchive it at any time to restore access</li>
          </ul>
        </div>
        <p className="text-xs text-[var(--muted)]">
          All endpoints, secrets, and configuration will be preserved.
        </p>
      </div>
    </Modal>
  );
}
