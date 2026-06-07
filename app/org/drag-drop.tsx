"use client";

import { useState, useCallback, type DragEvent } from "react";
import Link from "next/link";
import { ChevronDown, Building2, Folder } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Organization, Workspace } from "@/lib/db/schema";

// ─── Types ───────────────────────────────────────────────────────────────

export type DragState = {
  workspaceId: string;
  workspaceName: string;
} | null;

// ─── Droppable Org Card ──────────────────────────────────────────────────

export function DroppableOrgCard({
  org,
  workspaces,
  dragState,
  onAssign,
  onDragStart,
  onDragEnd,
}: {
  org: Organization;
  workspaces: Workspace[];
  dragState: DragState;
  onAssign: (workspaceId: string, orgId: string) => void;
  onDragStart: (id: string, name: string) => void;
  onDragEnd: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (
      e.currentTarget === e.target ||
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      setIsOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const workspaceId = e.dataTransfer.getData("text/plain");
      if (workspaceId) {
        onAssign(workspaceId, org.id);
      }
    },
    [org.id, onAssign],
  );

  return (
    <div
      className={`rounded border bg-[var(--sidebar-bg)] transition-all ${
        isOver
          ? "border-[var(--accent)] shadow-[0_0_24px_var(--accent-glow)] bg-[var(--hover-bg-strong)]"
          : "border-[var(--border)]"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-6 text-left hover:bg-[var(--hover-bg)] transition-colors"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[var(--accent)]/15 bg-[var(--accent)]/10 text-[var(--accent)] transition-all group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-[0_0_16px_var(--accent-glow)]">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium text-[var(--foreground)]">
            {org.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)] truncate">
            {org.description || "No description"}
          </p>
        </div>
        {dragState && (
          <span className="text-[11px] text-[var(--accent)] shrink-0 self-center">
            Drop here
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] p-3 space-y-1">
          {workspaces.length === 0 && !isOver && (
            <p className="px-3 py-2 text-[12px] text-[var(--muted)]">
              No workspaces yet. Drag one here.
            </p>
          )}
          {isOver && workspaces.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-[var(--accent)] font-medium">
              Release to add &quot;{dragState?.workspaceName}&quot;
            </p>
          )}
          {workspaces.map((ws) => (
            <DraggableWorkspaceRow
              key={ws.id}
              ws={ws}
              orgId={org.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Draggable Workspace Row (inside orgs) ───────────────────────────────

function DraggableWorkspaceRow({
  ws,
  orgId,
  onDragStart,
  onDragEnd,
}: {
  ws: Workspace;
  orgId: string;
  onDragStart: (id: string, name: string) => void;
  onDragEnd: () => void;
}) {
  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData("text/plain", ws.id);
      e.dataTransfer.effectAllowed = "move";
      onDragStart(ws.id, ws.name);
    },
    [ws.id, ws.name, onDragStart],
  );

  return (
    <div draggable onDragStart={handleDragStart} onDragEnd={onDragEnd}>
      <Link
        href={`/org/${orgId}/workspace/${ws.id}/personal`}
        className="group/ws flex items-center gap-3 rounded border border-transparent px-3 py-2.5 hover:border-[var(--border)] transition-colors"
        draggable={false}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] transition-all group-hover/ws:border-[var(--secondary)]/20 group-hover/ws:bg-[var(--secondary)]/10 group-hover/ws:text-[var(--secondary)] group-hover/ws:shadow-[0_0_16px_var(--secondary-glow)]">
          <Folder className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--foreground)]">
            {ws.name}
          </p>
          <p className="text-[12px] text-[var(--muted)] truncate">
            {ws.description}
          </p>
        </div>
      </Link>
    </div>
  );
}

// ─── Draggable Standalone Card ───────────────────────────────────────────

export function DraggableStandaloneCard({
  ws,
  onDragStart,
  onDragEnd,
}: {
  ws: Workspace;
  onDragStart: (id: string, name: string) => void;
  onDragEnd: () => void;
}) {
  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData("text/plain", ws.id);
      e.dataTransfer.effectAllowed = "move";
      onDragStart(ws.id, ws.name);
    },
    [ws.id, ws.name, onDragStart],
  );

  return (
    <div
      draggable
      className="cursor-grab active:cursor-grabbing"
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <Link
        href={`/org/s/workspace/${ws.id}/personal`}
        className="block"
        draggable={false}
      >
        <Card hoverable className="group cursor-pointer p-6 h-full">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] transition-all group-hover:border-[var(--secondary)]/20 group-hover:bg-[var(--secondary)]/10 group-hover:text-[var(--secondary)] group-hover:shadow-[0_0_16px_var(--secondary-glow)]">
              <Folder className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-medium text-[var(--foreground)]">
                {ws.name}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)] truncate">
                {ws.description || "No description"}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}

// ─── Standalone Drop Zone ────────────────────────────────────────────────

export function StandaloneDropZone({
  children,
  dragState,
  onUnassign,
}: {
  children: React.ReactNode;
  dragState: DragState;
  onUnassign: (workspaceId: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (
      e.currentTarget === e.target ||
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      setIsOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const workspaceId = e.dataTransfer.getData("text/plain");
      if (workspaceId) {
        onUnassign(workspaceId);
      }
    },
    [onUnassign],
  );

  return (
    <section
      className={`rounded-lg border transition-all ${
        dragState
          ? isOver
            ? "border-[var(--secondary)] bg-[var(--hover-bg-strong)] shadow-[0_0_24px_var(--secondary-glow)]"
            : "border-dashed border-[var(--secondary)]/30"
          : "border-transparent"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragState && isOver && (
        <div className="px-3 pt-3 pb-0">
          <p className="text-[12px] text-[var(--secondary)] font-medium">
            Drop to make &quot;{dragState.workspaceName}&quot; standalone
          </p>
        </div>
      )}
      {children}
    </section>
  );
}
