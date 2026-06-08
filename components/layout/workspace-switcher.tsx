"use client";

import { ChevronRight, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Workspace = {
  id: string;
  name: string;
  orgId?: string | null;
};

type Organization = {
  id: string;
  name: string;
};

export function WorkspaceSwitcher({
  placement = "down",
  variant = "full",
  activeWorkspaceId,
}: {
  placement?: "down" | "up";
  variant?: "full" | "icon";
  activeWorkspaceId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [hoveredOrgId, setHoveredOrgId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/workspaces").then((r) => r.json()),
      fetch("/api/organisations").then((r) => r.json()),
    ])
      .then(([wsData, orgData]) => {
        setWorkspaces(wsData);
        setOrgs(orgData);
      })
      .catch((err) => console.error(err));
  }, []);

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0],
    [activeWorkspaceId, workspaces],
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const orgWorkspaceMap = useMemo(() => {
    const map = new Map<string, Workspace[]>();
    for (const w of workspaces) {
      if (w.orgId) {
        if (!map.has(w.orgId)) map.set(w.orgId, []);
        map.get(w.orgId)!.push(w);
      }
    }
    return map;
  }, [workspaces]);

  const standalone = useMemo(
    () => workspaces.filter((w) => !w.orgId),
    [workspaces],
  );

  const initial = active ? active.name.trim().slice(0, 1).toUpperCase() : "-";

  const menuPositionClass =
    placement === "up" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]";

  const isIconVariant = variant === "icon";
  const iconMenuPositionClass =
    placement === "up"
      ? "bottom-0 left-[calc(100%+8px)] w-60"
      : "top-0 left-[calc(100%+8px)] w-60";

  if (!active && workspaces.length === 0) {
    return (
      <div
        className={
          isIconVariant ? "relative flex justify-center" : "relative mx-3"
        }
      >
        <div className="flex w-full items-center gap-3 rounded border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-2 animate-pulse">
          <div className="h-4 w-24 bg-[var(--border)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={
        isIconVariant ? "relative flex justify-center" : "relative mx-3"
      }
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setHoveredOrgId(null);
        }}
        className={
          isIconVariant
            ? "flex h-9 w-9 items-center justify-center rounded border border-[var(--border)] bg-[var(--hover-bg)] text-left transition-all hover:bg-[var(--hover-bg-strong)] hover:border-[var(--accent)]/20"
            : "flex w-full items-center gap-2.5 rounded border border-[var(--border)] bg-[var(--hover-bg)] px-2.5 py-2 text-left transition-all hover:bg-[var(--hover-bg-strong)] hover:border-[var(--accent)]/20"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Workspace switcher"
      >
        {isIconVariant ? (
          <ChevronsUpDown className="h-4 w-4 text-[var(--foreground)]" />
        ) : (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--accent)]/15 text-[10px] font-bold text-[var(--accent)]">
            {initial}
          </div>
        )}

        {!isIconVariant && active && (
          <>
            <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--foreground)]">
              {active.name}
            </p>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${
            isIconVariant
              ? iconMenuPositionClass
              : `left-0 ${menuPositionClass}`
          } z-50 flex`}
          onMouseLeave={() => setHoveredOrgId(null)}
        >
          {/* Left panel: orgs + standalone */}
          <div
            className={`${isIconVariant ? "w-60" : "w-56"} max-h-[min(50vh,340px)] overflow-y-auto rounded border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]`}
          >
            {/* Organizations */}
            {orgs.length > 0 && (
              <>
                <div className="px-2.5 pt-2.5 pb-1">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]/60">
                    Organizations
                  </p>
                </div>
                <ul className="px-1 pb-1">
                  {orgs.map((org) => {
                    const wsList = orgWorkspaceMap.get(org.id) ?? [];
                    return (
                      <li key={org.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredOrgId(org.id)}
                          className={`flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-all hover:bg-[var(--hover-bg)] ${
                            hoveredOrgId === org.id
                              ? "bg-[var(--hover-bg)] text-[var(--foreground)]"
                              : "text-[var(--muted)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--hover-bg)] text-[10px] font-bold text-[var(--muted)]">
                            <Building2 className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">
                              {org.name}
                            </p>
                          </div>
                          {wsList.length > 0 && (
                            <ChevronRight className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* Standalone */}
            {standalone.length > 0 && (
              <>
                {orgs.length > 0 && (
                  <div className="h-px bg-[var(--border)] mx-2.5" />
                )}
                <div className="px-2.5 pt-2.5 pb-1">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]/60">
                    Standalone
                  </p>
                </div>
                <ul className="px-1 pb-1">
                  {standalone.map((w) => {
                    const selected = w.id === active?.id;
                    const wInitial = w.name.trim().slice(0, 1).toUpperCase();
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpen(false);
                            router.push(`/org/s/workspace/${w.id}/personal`);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-all hover:bg-[var(--hover-bg)] ${
                            selected ? "bg-[var(--hover-bg-strong)]" : ""
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                              selected
                                ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                                : "bg-[var(--hover-bg)] text-[var(--foreground)]"
                            }`}
                          >
                            {wInitial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[var(--foreground)]">
                              {w.name}
                            </p>
                          </div>
                          {selected && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--secondary)]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="h-px bg-[var(--border)]" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push("/workspace/create");
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-[var(--foreground)] transition-all hover:bg-[var(--hover-bg)]"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--secondary)]" />
              Create workspace
            </button>
          </div>

          {/* Right panel: workspaces for hovered org */}
          {hoveredOrgId &&
            (() => {
              const org = orgs.find((o) => o.id === hoveredOrgId);
              const wsList = orgWorkspaceMap.get(hoveredOrgId) ?? [];
              if (!org || wsList.length === 0) return null;
              return (
                <div className="ml-2 w-52 max-h-[min(50vh,340px)] overflow-y-auto rounded border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                  <div className="px-2.5 pt-2.5 pb-1">
                    <p className="truncate text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]/60">
                      {org.name}
                    </p>
                  </div>
                  <ul className="px-1 pb-1">
                    {wsList.map((w) => {
                      const selected = w.id === active?.id;
                      return (
                        <li key={w.id}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpen(false);
                              router.push(
                                `/org/${org.id}/workspace/${w.id}/personal`,
                              );
                            }}
                            className={`flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-all hover:bg-[var(--hover-bg)] ${
                              selected ? "bg-[var(--hover-bg-strong)]" : ""
                            }`}
                          >
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                                selected
                                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                                  : "bg-[var(--hover-bg)] text-[var(--foreground)]"
                              }`}
                            >
                              {w.name.trim().slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-[var(--foreground)]">
                                {w.name}
                              </p>
                            </div>
                            {selected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--secondary)]" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
}
