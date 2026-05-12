"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Matching the Workspace schema returned by API
type Workspace = {
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
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch workspaces");
        return res.json();
      })
      .then((data) => setWorkspaces(data))
      .catch((err) => console.error(err));
  }, []);

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0],
    [activeWorkspaceId, workspaces],
  );

  useEffect(() => {
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
  }, []);

  const initial = active ? active.name.trim().slice(0, 1).toUpperCase() : "-";

  const menuPositionClass =
    placement === "up" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]";

  const isIconVariant = variant === "icon";
  const iconMenuPositionClass =
    placement === "up"
      ? "bottom-0 left-[calc(100%+8px)] w-64"
      : "top-0 left-[calc(100%+8px)] w-64";

  if (!active && workspaces.length === 0) {
    return (
      <div
        className={
          isIconVariant ? "relative flex justify-center" : "relative mx-4"
        }
      >
        <div className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-2 animate-pulse">
          <div className="h-4 w-24 bg-[var(--border)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={
        isIconVariant ? "relative flex justify-center" : "relative mx-4"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          isIconVariant
            ? "flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--hover-bg)] text-left transition-colors hover:bg-[var(--hover-bg-strong)]"
            : "flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--hover-bg)] px-3 py-2 text-left transition-colors hover:bg-[var(--hover-bg-strong)]"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Workspace switcher"
      >
        {isIconVariant ? (
          <ChevronsUpDown className="h-5 w-5 text-[var(--foreground)]" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--card-bg)] text-xs font-semibold text-[var(--foreground)]">
            {initial}
          </div>
        )}

        {!isIconVariant && active && (
          <>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
              {active.name}
            </p>

            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute ${
            isIconVariant
              ? iconMenuPositionClass
              : `left-0 right-0 ${menuPositionClass}`
          } z-50 overflow-y-auto max-h-[min(50vh,320px)] rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_12px_30px_rgba(0,0,0,0.22)]`}
        >
          <ul className="p-1">
            {workspaces.map((w) => {
              const selected = w.id === active?.id;
              const wInitial = w.name.trim().slice(0, 1).toUpperCase();
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/workspace/${w.id}/personal`);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--hover-bg)]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--hover-bg)] text-xs font-semibold text-[var(--foreground)]">
                      {wInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {w.name}
                      </p>
                    </div>
                    {selected ? (
                      <Check className="h-4 w-4 text-[var(--accent)]" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="h-px bg-[var(--border)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push("/workspace/create");
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--hover-bg)]"
          >
            <Plus className="h-4 w-4 text-[var(--muted)]" />
            Create workspace
          </button>
        </div>
      )}
    </div>
  );
}
