import { Button } from "../basic/buttons/button";
import { Modal } from "../ui/modal";
import { BrainEntry } from "./brain-types";

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--sidebar-bg)]/70 p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function BrainEntryModal({
  entry,
  isOpen,
  onClose,
}: {
  entry: BrainEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Brain Entry Details"
      description="Full memory entry information"
      maxWidthClassName="max-w-3xl"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-[var(--sidebar-bg)]/70 p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Summary</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">{entry.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetaItem label="Type" value={entry.type} />
          <MetaItem label="Category" value={entry.category} />
          <MetaItem label="Confidence" value={`${Math.round(entry.confidence * 100)}%`} />
          <MetaItem label="Reinforcement Count" value={entry.reinforcementCount.toString()} />
          <MetaItem label="Created At" value={new Date(entry.createdAt).toLocaleString()} />
          <MetaItem label="Entry Id" value={entry.id} />
        </div>

        <div className="rounded-xl bg-[var(--sidebar-bg)]/70 p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Tags</p>
          {entry.tags && entry.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={`${entry.id}-${tag}`}
                  className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1 text-xs text-[var(--foreground)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No tags for this entry.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
