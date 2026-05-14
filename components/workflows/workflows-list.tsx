"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Workflow,
  ChevronRight as ChevronRightIcon,
  Sparkles,
  Clock,
  Trash2,
} from "lucide-react";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { Dropdown } from "@/components/basic/input/dropdown";
import { ActionMenu } from "@/components/basic/input/action-menu";
import {
  createWorkflowAction,
  deleteWorkflowAction,
} from "@/app/workspace/[workspaceId]/personal/workflows/actions";
import { type Workflow as WorkflowType } from "@/lib/db/schema";
import { WorkflowDeleteModal } from "./workflow-delete-modal";

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function WorkflowsList({
  initialWorkflows,
  workspaceId,
  total,
  currentPage,
  pageSize,
}: {
  initialWorkflows: WorkflowType[];
  workspaceId: string;
  total: number;
  currentPage: number;
  pageSize: number;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title) return;
    const formData = new FormData(e.currentTarget);
    formData.append("status", status);
    startTransition(async () => {
      try {
        await createWorkflowAction(workspaceId, formData);
        setIsSheetOpen(false);
        setTitle("");
        setDescription("");
        setStatus("active");
      } catch (err) {
        console.error("Failed to create workflow", err);
      }
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-8">
      <div className="w-full px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">Automation</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Workflows
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Manage your AI-generated automation plans.
            </p>
          </div>
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Workflow</span>
          </Button>
        </div>

        {/* Create Sheet */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Create New Workflow"
          description="Define an automation plan for your workspace."
          footer={<></>}
        >
          <form className="space-y-6" onSubmit={handleCreate}>
            <div className="space-y-6">
              <Input
                name="title"
                label="Workflow Title"
                placeholder="e.g. Post-Purchase Automation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Textarea
                name="description"
                label="Description"
                placeholder="What does this workflow do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Dropdown
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { label: "Active", value: "active" },
                  { label: "Archived", value: "archived" },
                ]}
              />
            </div>
            <div className="mt-8 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSheetOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !title}>
                {isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </form>
        </Sheet>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
          {initialWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              workspaceId={workspaceId}
            />
          ))}
          {initialWorkflows.length === 0 && (
            <div className="rounded border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[13px] text-[var(--muted)]">
              No workflows yet. Create one to get started.
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between px-2">
            <div className="text-sm text-[var(--muted)]">
              Showing{" "}
              <span className="font-medium text-[var(--foreground)]">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-[var(--foreground)]">
                {Math.min(currentPage * pageSize, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[var(--foreground)]">
                {total}
              </span>{" "}
              workflows
            </div>
            <div className="flex items-center gap-2">
              <Link href={currentPage > 1 ? `?page=${currentPage - 1}` : "#"}>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Link key={page} href={`?page=${page}`}>
                      <Button
                        variant={page === currentPage ? "primary" : "outline"}
                        size="icon"
                        className="text-sm"
                      >
                        {page}
                      </Button>
                    </Link>
                  ),
                )}
              </div>
              <Link
                href={
                  currentPage < totalPages ? `?page=${currentPage + 1}` : "#"
                }
              >
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowCard({
  workflow,
  workspaceId,
}: {
  workflow: WorkflowType;
  workspaceId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteWorkflow = () => {
    startTransition(async () => {
      await deleteWorkflowAction(workspaceId, workflow.id);
      setIsDeleteModalOpen(false);
    });
  };

  return (
    <>
      <Link
        href={`/workspace/${workspaceId}/personal/workflows/${workflow.id}`}
      >
        <Card
          hoverable
          className={`group cursor-pointer p-5 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--accent)]/15 bg-[var(--accent)]/10 text-[var(--accent)] transition-all group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-[0_0_16px_var(--accent-glow)]">
                <Workflow className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-medium text-[var(--foreground)]">
                    {workflow.title}
                  </h3>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      workflow.status === "active"
                        ? "bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20"
                        : workflow.status === "archived"
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : "bg-[var(--border)] text-[var(--muted)] border border-[var(--border)]"
                    }`}
                  >
                    {workflow.status}
                  </span>
                </div>
                {workflow.description && (
                  <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Updated {timeAgo(new Date(workflow.updatedAt))}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 -mt-1">
              <div className="shrink-0" onClick={(e) => e.preventDefault()}>
                <ActionMenu
                  onSelect={(val) => {
                    if (val === "delete") {
                      setIsDeleteModalOpen(true);
                    }
                  }}
                  options={[
                    {
                      label: "Delete",
                      value: "delete",
                      icon: <Trash2 className="h-4 w-4" />,
                      destructive: true,
                    },
                  ]}
                />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded text-[var(--muted)] transition-all group-hover:bg-[var(--hover-bg)] group-hover:text-[var(--foreground)] group-hover:translate-x-0.5">
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Card>
      </Link>
      <WorkflowDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteWorkflow}
        workflowTitle={workflow.title}
        isPending={isPending}
      />
    </>
  );
}
