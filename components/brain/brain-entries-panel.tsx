import Link from "next/link";
import { Brain as BrainIcon, Play, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../basic/buttons/button";
import { Card } from "../ui/card";
import { BrainEntry } from "./brain-types";

export function BrainEntriesPanel({
  entries,
  totalEntries,
  currentPage,
  pageSize,
  triggering,
  onProcessLogs,
  onEntryClick,
}: {
  entries: BrainEntry[];
  totalEntries: number;
  currentPage: number;
  pageSize: number;
  triggering: "ingest" | "reinforce" | null;
  onProcessLogs: () => void;
  onEntryClick: (entry: BrainEntry) => void;
}) {
  const totalPages = Math.ceil(totalEntries / pageSize);
  return (
    <div className="overflow-hidden">
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Recent Brain Entries</h2>
          <p className="text-sm text-[var(--muted)]">
            Latest extracted facts and episodes from workspace activity
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onProcessLogs}
          disabled={triggering !== null}
          className="rounded-full"
        >
          <Play className="h-4 w-4" />
          {triggering === "ingest" ? "Processing..." : "Process Logs"}
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--background)]/60 px-6 py-12 text-center">
          <BrainIcon className="mb-3 h-8 w-8 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">
            No brain entries yet. Run ingestion to start building memory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-x-hidden">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              hoverable
              className="cursor-pointer border-[var(--border)]/70 bg-[var(--sidebar-bg)] p-3.5"
              onClick={() => onEntryClick(entry)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      {entry.type}
                    </span>
                    <span className="rounded-full bg-[var(--hover-bg)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      {entry.category}
                    </span>
                  </div>
                  <p
                    className="line-clamp-2 break-words text-sm font-medium leading-snug text-[var(--foreground)]"
                    title={entry.summary}
                  >
                    {entry.summary}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span
                          key={`${entry.id}-${tag}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--background)] px-2 py-1 text-[11px] text-[var(--muted)]"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-[11px] text-[var(--muted)]">+{entry.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-[var(--accent)]/12 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                  {Math.round(entry.confidence * 100)}%
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalEntries > 0 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between px-2">
          <div className="text-sm text-[var(--muted)]">
            Showing{" "}
            <span className="font-medium text-[var(--foreground)]">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-[var(--foreground)]">
              {Math.min(currentPage * pageSize, totalEntries)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--foreground)]">{totalEntries}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Link href={currentPage > 1 ? `?page=${currentPage - 1}` : "#"}>
              <Button variant="outline" size="icon" disabled={currentPage <= 1} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Link key={page} href={`?page=${page}`}>
                  <Button
                    variant={page === currentPage ? "primary" : "outline"}
                    size="icon"
                    className="text-sm"
                  >
                    {page}
                  </Button>
                </Link>
              ))}
            </div>
            <Link href={currentPage < totalPages ? `?page=${currentPage + 1}` : "#"}>
              <Button variant="outline" size="icon" disabled={currentPage >= totalPages} aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
