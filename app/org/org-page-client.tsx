"use client";

import { useState } from "react";
import { ChevronDown, Building2, Folder, Plus } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/basic/buttons/button";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { createOrganisationAction } from "./actions";
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
              Organizations &amp; workspaces
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
                <OrgCard
                  key={org.id}
                  org={org}
                  workspaces={workspaceMap.get(org.id) ?? []}
                />
              ))}
            </div>
          )}
        </section>

        {/* Standalone workspaces */}
        {standaloneWorkspaces.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-[var(--muted)]" />
              <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                Standalone workspaces
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {standaloneWorkspaces.map((ws) => (
                <StandaloneCard key={ws.id} ws={ws} />
              ))}
            </div>
          </section>
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

// ─── Cards ───────────────────────────────────────────────────────────────

function OrgCard({
  org,
  workspaces,
}: {
  org: Organization;
  workspaces: Workspace[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)]">
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
        <ChevronDown
          className={`h-4 w-4 shrink-0 mt-1 text-[var(--muted)] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] p-3 space-y-1">
          {workspaces.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-[var(--muted)]">
              No workspaces yet.
            </p>
          ) : (
            workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/org/${org.id}/workspace/${ws.id}/personal`}
                className="group/ws flex items-center gap-3 rounded border border-transparent px-3 py-2.5 hover:border-[var(--border)] transition-colors"
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
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StandaloneCard({ ws }: { ws: Workspace }) {
  return (
    <Link href={`/org/s/workspace/${ws.id}/personal`} className="block">
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
  );
}
