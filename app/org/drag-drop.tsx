"use client";

import { useState, useCallback, type DragEvent } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Building2,
  Folder,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/basic/buttons/button";
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
  onReactivate,
  reactivatingId,
  onDragStart,
  onDragEnd,
  costs,
  showCost,
}: {
  org: Organization;
  workspaces: Workspace[];
  dragState: DragState;
  onAssign: (workspaceId: string, orgId: string) => void;
  onReactivate?: (workspaceId: string) => void;
  reactivatingId?: string | null;
  onDragStart: (id: string, name: string) => void;
  onDragEnd: () => void;
  costs: Record<string, number>;
  showCost: boolean;
}) {
  const [isOver, setIsOver] = useState(false);
  const [clickExpanded, setClickExpanded] = useState(false);

  // If the org was manually expanded, keep it open during drag.
  // Otherwise auto-expand on hover during drag.
  const expanded = dragState ? clickExpanded || isOver : clickExpanded;

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
        onClick={() => {
          if (!dragState) setClickExpanded((v) => !v);
        }}
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
          {isOver && dragState && (
            <div
              className={`rounded border border-dashed border-[var(--accent)]/40 ${
                workspaces.length === 0 ? "p-4" : "p-3"
              } flex items-center justify-center gap-3`}
            >
              <Folder
                className={`${
                  workspaces.length === 0 ? "h-5 w-5" : "h-4 w-4"
                } text-[var(--accent)]/60`}
              />
              <span
                className={`${
                  workspaces.length === 0 ? "text-sm" : "text-[13px]"
                } text-[var(--accent)]/60`}
              >
                {workspaces.length === 0
                  ? `Drop "${dragState.workspaceName}" here`
                  : `Add "${dragState.workspaceName}"`}
              </span>
            </div>
          )}
          {workspaces.length === 0 && !(isOver && dragState) && (
            <p className="px-3 py-2 text-[12px] text-[var(--muted)]">
              No workspaces yet.
            </p>
          )}
          {workspaces.map((ws) => (
            <DraggableWorkspaceRow
              key={ws.id}
              ws={ws}
              orgId={org.id}
              onReactivate={onReactivate}
              reactivatingId={reactivatingId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              costs={costs}
              showCost={showCost}
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
  onReactivate,
  reactivatingId,
  onDragStart,
  onDragEnd,
  costs,
  showCost,
}: {
  ws: Workspace;
  orgId: string;
  onReactivate?: (workspaceId: string) => void;
  reactivatingId?: string | null;
  onDragStart: (id: string, name: string) => void;
  onDragEnd: () => void;
  costs: Record<string, number>;
  showCost: boolean;
}) {
  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData("text/plain", ws.id);
      e.dataTransfer.effectAllowed = "move";
      onDragStart(ws.id, ws.name);
    },
    [ws.id, ws.name, onDragStart],
  );

  const inner = (
    <>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] transition-all group-hover/ws:border-[var(--secondary)]/20 group-hover/ws:bg-[var(--secondary)]/10 group-hover/ws:text-[var(--secondary)] group-hover/ws:shadow-[0_0_16px_var(--secondary-glow)]">
        <Folder className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[var(--foreground)]">
            {ws.name}
          </p>
          {ws.deactivatedAt && (
            <span className="rounded border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              Deactivated
            </span>
          )}
        </div>
        <p className="text-[12px] text-[var(--muted)] truncate">
          {ws.description}
        </p>
        {showCost && (
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
            ${(costs[ws.id] ?? 0).toFixed(4)}
          </p>
        )}
      </div>
      {ws.deactivatedAt && onReactivate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReactivate(ws.id);
          }}
          disabled={reactivatingId === ws.id}
          className="shrink-0"
        >
          {reactivatingId === ws.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </>
  );

  const wrapperClassName =
    "group/ws flex items-center gap-3 rounded border border-transparent px-3 py-2.5 hover:border-[var(--border)] transition-colors";

  return (
    <div draggable onDragStart={handleDragStart} onDragEnd={onDragEnd}>
      {ws.deactivatedAt ? (
        <div className={`${wrapperClassName} opacity-60`}>{inner}</div>
      ) : (
        <Link
          href={`/org/${orgId}/workspace/${ws.id}/personal`}
          className={wrapperClassName}
          draggable={false}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}

// ─── Draggable Standalone Card ───────────────────────────────────────────

export function DraggableStandaloneCard({
  ws,
  onReactivate,
  reactivatingId,
  onDragStart,
  onDragEnd,
  costs,
  showCost,
}: {
  ws: Workspace;
  onReactivate?: (workspaceId: string) => void;
  reactivatingId?: string | null;
  onDragStart: (id: string, name: string) => void;
  onDragEnd: () => void;
  costs: Record<string, number>;
  showCost: boolean;
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
      {ws.deactivatedAt ? (
        <div className="block opacity-60">
          <Card className="group p-6 h-full">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)]">
                <Folder className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-[var(--foreground)]">
                    {ws.name}
                  </h3>
                  <span className="rounded border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Deactivated
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)] truncate">
                  {ws.description || "No description"}
                </p>
                {showCost && (
                  <p className="mt-1 text-[12px] text-emerald-400 font-mono">
                    ${(costs[ws.id] ?? 0).toFixed(4)}
                  </p>
                )}
              </div>
              {onReactivate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReactivate(ws.id);
                  }}
                  disabled={reactivatingId === ws.id}
                  className="shrink-0 self-start"
                >
                  {reactivatingId === ws.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : (
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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-[var(--foreground)]">
                    {ws.name}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)] truncate">
                  {ws.description || "No description"}
                </p>
                {showCost && (
                  <p className="mt-1 text-[12px] text-emerald-400 font-mono">
                    ${(costs[ws.id] ?? 0).toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </Link>
      )}
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragState && isOver && (
        <div className="rounded border border-dashed border-[var(--secondary)]/40 p-6 flex items-center justify-center gap-3">
          <Folder className="h-5 w-5 text-[var(--secondary)]/60" />
          <span className="text-sm text-[var(--secondary)]/60">
            Drop here to make standalone
          </span>
        </div>
      )}
      {children}
    </section>
  );
}
