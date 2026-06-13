"use client";

import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/basic/input/input";

const AVAILABLE_EVENTS = [
  "chat.created",
  "chat.deleted",
  "message.created",
  "message.completed",
  "message.error",
  "tool.called",
];

interface WebhookCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  action: (formData: FormData) => void;
  formError: string | null;
  isPending: boolean;
}

export function WebhookCreateSheet({
  isOpen,
  onClose,
  action,
  formError,
  isPending,
}: WebhookCreateSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add Webhook"
      description="Configure a new webhook to receive real-time event notifications."
      footer={<></>}
    >
      <form action={action} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Payload URL"
            name="url"
            placeholder="https://example.com/webhook"
            autoFocus
            required
            type="url"
          />

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[var(--foreground)]">
              Events
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="events"
                    value={event}
                    className="rounded border-[var(--border)] bg-[var(--sidebar-bg)] text-[var(--accent)]"
                  />
                  <span className="text-[13px] text-[var(--muted)]">{event}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {formError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {formError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            isLoading={isPending}
          >
            Save Webhook
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
