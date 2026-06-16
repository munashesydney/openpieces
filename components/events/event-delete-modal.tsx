"use client";

import { Button } from "@/components/basic/buttons/button";
import { Modal } from "../ui/modal";
import { Zap } from "lucide-react";

export function EventDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  eventName,
  subscriptionCount,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventName: string;
  subscriptionCount: number;
  isPending?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      danger
      title="Delete event?"
      description="Review the impact before continuing."
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete event"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          You are about to permanently delete{" "}
          <span className="inline-flex items-center gap-1.5 rounded bg-[var(--hover-bg)] px-1.5 py-0.5 font-semibold font-mono text-xs">
            <Zap className="h-3 w-3 text-[var(--secondary)]" />
            {eventName}
          </span>.
        </p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            What will be affected
          </p>
          <ul className="space-y-1 text-sm text-[var(--foreground)]">
            <li>
              - Any subscriptions linking workflows to this event will be
              removed automatically
            </li>
            {subscriptionCount > 0 && (
              <li>
                -{" "}
                <span className="font-semibold">
                  {subscriptionCount}{" "}
                  {subscriptionCount === 1 ? "workflow is" : "workflows are"}{" "}
                  currently subscribed
                </span>{" "}
                — they will stop triggering on this event
              </li>
            )}
          </ul>
        </div>
        <p className="text-xs text-[var(--muted)]">
          This action is irreversible and cannot be recovered later.
        </p>
      </div>
    </Modal>
  );
}
