"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Zap, Pencil } from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "@/components/ui/sheet";
import type { ActionResult } from "@/app/org/[ordId]/workspace/[workspaceId]/personal/events/actions";
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
} from "@/app/org/[ordId]/workspace/[workspaceId]/personal/events/actions";
import { EventDeleteModal } from "./event-delete-modal";

type EventItem = {
  id: string;
  eventName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type EventsPageProps = {
  initialEvents: {
    id: string;
    workspaceId: string;
    eventName: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  subscriptionCounts: Record<string, number>;
  workspaceId: string;
};

export function EventsPage({
  initialEvents,
  subscriptionCounts,
  workspaceId,
}: EventsPageProps) {
  const [events, setEvents] = useState<EventItem[]>(
    initialEvents.map((e) => ({
      id: e.id,
      eventName: e.eventName,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventName) return;

    setFormError(null);

    const formData = new FormData();
    formData.set("eventName", `op.${eventName}`);
    formData.set("description", description);

    startTransition(async () => {
      let result: ActionResult;
      if (editingId) {
        result = await updateEventAction(workspaceId, editingId, formData);
      } else {
        result = await createEventAction(workspaceId, formData);
      }

      if ("error" in result) {
        setFormError(result.error);
        return;
      }

      setEventName("");
      setDescription("");
      setEditingId(null);
      setIsSheetOpen(false);

      const now = new Date().toISOString();
      if (editingId) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  eventName: `op.${eventName}`,
                  description,
                  updatedAt: now,
                }
              : e,
          ),
        );
      } else {
        setEvents((prev) => [
          {
            id: crypto.randomUUID(),
            eventName: `op.${eventName}`,
            description,
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
      const result = await deleteEventAction(workspaceId, id);
      if ("error" in result) return;
      setEvents((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    handleDelete(eventToDelete.id);
    setEventToDelete(null);
  };

  const handleEdit = (ev: EventItem) => {
    setEditingId(ev.id);
    setEventName(
      ev.eventName.startsWith("op.") ? ev.eventName.slice(3) : ev.eventName,
    );
    setDescription(ev.description);
    setFormError(null);
    setIsSheetOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setEventName("");
    setDescription("");
    setFormError(null);
    setIsSheetOpen(true);
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-8">
      <div className="w-full px-4 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
              Events
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Events
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Events are named signals that services emit. Workflows subscribe
              to events and get triggered automatically when they fire.
            </p>
          </div>
          <Button type="button" className="gap-2" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add event
          </Button>
        </div>

        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title={editingId ? "Edit event" : "Add event"}
          description={
            editingId
              ? "Update the event name or description."
              : "Create a new event that workflows can subscribe to."
          }
          footer={<></>}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Event name
              </label>
              <div className="flex items-center rounded border border-[var(--border)] bg-[var(--input-bg)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/50 transition-all">
                <span className="shrink-0 pl-3 pr-1 text-[13px] font-mono text-[var(--accent)] select-none">
                  op.
                </span>
                <input
                  name="eventName"
                  placeholder="stripe.payment_intent.succeeded"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  className="w-full bg-transparent py-2.5 pr-3 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)]/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Optional description of what this event represents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors resize-none"
              />
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
                onClick={() => setIsSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={isPending || !eventName}
              >
                <Plus className="h-4 w-4" />
                {isPending
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add event"}
              </Button>
            </div>
          </form>
        </Sheet>

        <section className="space-y-3">
          {events.length > 0 && (
            <div className="flex items-center justify-end">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </div>
          )}

          <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--background-soft)]">
            {events.length === 0 ? (
              <div className="rounded border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
                <Zap className="mx-auto mb-3 h-6 w-6 text-[var(--muted)]/40" />
                No events yet. Create one to let workflows subscribe and react.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_100px] gap-3 bg-[var(--background)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  <span>Event name</span>
                  <span>Subscribers</span>
                  <span className="text-right">Created</span>
                  <span className="text-right">Actions</span>
                </div>
                {events.map((ev) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    subscriptionCount={subscriptionCounts[ev.id] ?? 0}
                    onDeleteRequest={setEventToDelete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <EventDeleteModal
          isOpen={eventToDelete !== null}
          onClose={() => setEventToDelete(null)}
          onConfirm={handleConfirmDelete}
          eventName={eventToDelete?.eventName ?? ""}
          subscriptionCount={
            eventToDelete ? (subscriptionCounts[eventToDelete.id] ?? 0) : 0
          }
          isPending={isPending}
        />
      </div>
    </div>
  );
}

function EventRow({
  event,
  subscriptionCount,
  onDeleteRequest,
  onEdit,
}: {
  event: EventItem;
  subscriptionCount: number;
  onDeleteRequest: (event: EventItem) => void;
  onEdit: (event: EventItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_100px] sm:items-center px-4 py-4 sm:py-3 text-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--secondary)]" />
          <span className="truncate font-medium text-[var(--foreground)] font-mono">
            {event.eventName}
          </span>
        </div>
        {event.description && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
            {event.description}
          </p>
        )}
      </div>
      <div className="min-w-0">
        {subscriptionCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
            {subscriptionCount}{" "}
            {subscriptionCount === 1 ? "workflow" : "workflows"}
          </span>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        )}
      </div>
      <div className="text-right text-[var(--muted)]">
        {new Date(event.createdAt).toLocaleDateString()}
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[var(--muted)]"
          onClick={() => onEdit(event)}
          aria-label="Edit event"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[var(--muted)] hover:text-red-500"
          onClick={() => onDeleteRequest(event)}
          aria-label="Delete event"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
