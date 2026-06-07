"use client";

import { useState, useCallback } from "react";
import { Building2, Folder, Plus } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import {
  createOrganisationAction,
  assignToOrganisationAction,
  unassignFromOrganisationAction,
} from "./actions";
import {
  DroppableOrgCard,
  DraggableStandaloneCard,
  StandaloneDropZone,
} from "./drag-drop";
import type { Organization, Workspace } from "@/lib/db/schema";

type Props = {
  organisations: Organization[];
  standaloneWorkspaces: Workspace[];
  workspaceMap: Map<string, Workspace[]>;
};

export function OrgPageClient({
  organisations,
  standaloneWorkspaces,
  workspaceMap,
}: Props) {
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    workspaceId: string;
    workspaceName: string;
  } | null>(null);

  const handleCreateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    setCreatePending(true);

    const formData = new FormData(e.currentTarget);
    const result = await createOrganisationAction(formData);

    if ("error" in result) {
      setCreateError(result.error as string);
      setCreatePending(false);
      return;
    }

    setCreatePending(false);
    setCreateModalOpen(false);
    setNewMenuOpen(false);
  };

  const handleAssign = useCallback(
    async (workspaceId: string, orgId: string) => {
      await assignToOrganisationAction(workspaceId, orgId);
      setDragState(null);
    },
    [],
  );

  const handleUnassign = useCallback(async (workspaceId: string) => {
    await unassignFromOrganisationAction(workspaceId);
    setDragState(null);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="flex h-20 shrink-0 items-center border-b border-[var(--border)] bg-[var(--sidebar-bg)]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/op-not-moving.png"
              alt="OpenPieces"
              className="h-12 w-12 rounded object-cover"
            />
            <Link
              href="/org"
              className="text-lg font-bold text-[var(--foreground)]"
            >
              openpieces
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-12">
        {/* Heading */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--foreground)]">
              Organizations &amp; Workspaces
            </h1>
            <p className="mt-2 text-base text-[var(--muted)]">
              Choose where you want to work.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNewMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                New
              </button>
              {newMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    onClick={() => setNewMenuOpen(false)}
                    aria-label="Close"
                  />
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded border border-[var(--border)] bg-[var(--sidebar-bg)] shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setNewMenuOpen(false);
                        setCreateModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5 text-[var(--muted)]" />
                      New organization
                    </button>
                    <div className="h-px bg-[var(--border)]" />
                    <button
                      type="button"
                      onClick={() => setNewMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <Folder className="h-3.5 w-3.5 text-[var(--muted)]" />
                      New workspace
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Organizations */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-[var(--muted)]" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Organizations
            </h2>
          </div>

          {organisations.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--border)] bg-[var(--sidebar-bg)] p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-[var(--muted)]" />
              <p className="mt-3 text-sm text-[var(--muted)]">
                No organizations yet.
              </p>
              <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create organization
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {organisations.map((org) => (
                <DroppableOrgCard
                  key={org.id}
                  org={org}
                  workspaces={workspaceMap.get(org.id) ?? []}
                  dragState={dragState}
                  onAssign={handleAssign}
                  onDragStart={(id, name) =>
                    setDragState({ workspaceId: id, workspaceName: name })
                  }
                  onDragEnd={() => setDragState(null)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Standalone workspaces */}
        {standaloneWorkspaces.length > 0 && (
          <StandaloneDropZone dragState={dragState} onUnassign={handleUnassign}>
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-[var(--muted)]" />
              <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Standalone workspaces
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {standaloneWorkspaces.map((ws) => (
                <DraggableStandaloneCard
                  key={ws.id}
                  ws={ws}
                  onDragStart={(id, name) =>
                    setDragState({ workspaceId: id, workspaceName: name })
                  }
                  onDragEnd={() => setDragState(null)}
                />
              ))}
            </div>
          </StandaloneDropZone>
        )}
      </main>

      {/* Create organisation modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateError(null);
        }}
        title="Create organization"
        description="Organizations group related workspaces together."
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreateModalOpen(false);
                setCreateError(null);
              }}
              disabled={createPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-org-form"
              isLoading={createPending}
            >
              {createPending ? "Creating..." : "Create"}
            </Button>
          </div>
        }
      >
        <form
          id="create-org-form"
          onSubmit={handleCreateOrg}
          className="space-y-4"
        >
          <Input
            name="name"
            label="Name"
            placeholder="e.g. Acme Corp"
            required
            autoFocus
          />
          <Textarea
            name="description"
            label="Description"
            placeholder="Brief description of this organization"
          />
          {createError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {createError}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
