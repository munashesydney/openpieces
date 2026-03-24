"use client";

import { Button } from "@/components/basic/buttons/button";
import { Modal } from "../ui/modal";

export function WorkflowDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  workflowTitle,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workflowTitle: string;
  isPending?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      danger
      title="Delete workflow?"
      description="Review the impact before continuing."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete workflow"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          You are about to permanently delete <span className="font-semibold">&quot;{workflowTitle}&quot;</span>.
          This will remove the workflow and all dependent records tied to it.
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What will be deleted
          </p>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>- The workflow definition and configuration</li>
            <li>- All related services linked to this workflow</li>
            <li>- All related tasks linked to this workflow</li>
          </ul>
        </div>
        <p className="text-xs text-[var(--muted)]">
          This action is irreversible and cannot be recovered later.
        </p>
      </div>
    </Modal>
  );
}
