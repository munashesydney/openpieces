"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Terminal,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Sheet } from "../ui/sheet";
import { HubBadge } from "./hub-badge";
import { Input } from "@/components/basic/input/input";
import { Textarea } from "@/components/basic/input/textarea";
import { Dropdown } from "@/components/basic/input/dropdown";
import { ActionMenu } from "@/components/basic/input/action-menu";
import {
  createServiceAction,
  deleteServiceAction,
} from "@/app/org/[ordId]/workspace/[workspaceId]/personal/services/actions";
import { type Service, type Workflow } from "@/lib/db/schema";
import { ServiceDeleteModal } from "./service-delete-modal";

export function ServicesList({
  initialServices,
  workspaceId,
  orgId,
  total,
  currentPage,
  pageSize,
  workflows,
  podmanEnabled,
}: {
  initialServices: Service[];
  workspaceId: string;
  orgId: string;
  total: number;
  currentPage: number;
  pageSize: number;
  workflows: Workflow[];
  podmanEnabled?: boolean;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newServiceType, setNewServiceType] = useState("trigger");
  const [newServiceRuntime, setNewServiceRuntime] = useState("deno");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [directory, setDirectory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const filteredServices = initialServices.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const triggers = filteredServices.filter((s) => s.type === "trigger");
  const actions = filteredServices.filter((s) => s.type === "action");

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title) return;
    if (newServiceType === "trigger" && !selectedWorkflow) return;

    setFormError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("type", newServiceType);

    startTransition(async () => {
      const result = await createServiceAction(workspaceId, formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setIsSheetOpen(false);
      setTitle("");
      setDescription("");
      setDirectory("");
      setNewServiceType("trigger");
      setSelectedWorkflow("");
      setFormError(null);
    });
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-8">
      <div className="w-full px-4 space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
              Services
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Pieces
            </h1>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              Manage and deploy AI-generated pieces within your workspace.
            </p>
          </div>
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Piece</span>
          </Button>
        </div>

        {/* New Service Sheet */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setFormError(null);
          }}
          title="Create New Piece"
          description="Define a new trigger or action for your workspace."
          footer={<></>} // Handled inside form
        >
          <form className="space-y-6" onSubmit={handleCreateService}>
            <div className="space-y-6">
              <Input
                name="title"
                label="Service Title"
                placeholder="e.g. Stripe Webhook"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Dropdown
                label="Service Type"
                value={newServiceType}
                onChange={setNewServiceType}
                options={[
                  { label: "Trigger (Event Source)", value: "trigger" },
                  { label: "Action (Endpoint)", value: "action" },
                ]}
              />
              <Dropdown
                label="Runtime"
                value={newServiceRuntime}
                onChange={setNewServiceRuntime}
                options={[
                  { label: "Deno (TypeScript)", value: "deno" },
                  ...(podmanEnabled
                    ? [{ label: "Podman (Docker/Container)", value: "podman" }]
                    : []),
                ]}
              />
              <input type="hidden" name="runtime" value={newServiceRuntime} />
              <Dropdown
                label={
                  newServiceType === "trigger"
                    ? "Workflow (Required)"
                    : "Workflow (Optional)"
                }
                value={selectedWorkflow}
                onChange={setSelectedWorkflow}
                options={[
                  { label: "Select a workflow...", value: "" },
                  ...workflows.map((w) => ({ label: w.title, value: w.id })),
                ]}
              />
              <input type="hidden" name="workflowId" value={selectedWorkflow} />
              <Textarea
                name="description"
                label="Description"
                placeholder="What should this service do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                name="directory"
                label="Directory (for OpenCode)"
                placeholder="/path/to/project (optional)"
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
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
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending ||
                  !title ||
                  (newServiceType === "trigger" && !selectedWorkflow)
                }
              >
                {isPending ? "Creating..." : "Create Piece"}
              </Button>
            </div>
          </form>
        </Sheet>

        {/* Triggers Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Triggers
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {triggers.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                workspaceId={workspaceId}
                orgId={orgId}
              />
            ))}
            {triggers.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                No triggers found.
              </div>
            )}
          </div>
        </section>

        {/* Actions Section */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-1">
            <Terminal className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Actions
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {actions.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                workspaceId={workspaceId}
                orgId={orgId}
              />
            ))}
            {actions.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                No actions found.
              </div>
            )}
          </div>
        </section>

        {/* Pagination UI */}
        {total > 0 && (
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
              pieces
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
                {Array.from(
                  { length: Math.ceil(total / pageSize) },
                  (_, i) => i + 1,
                ).map((page) => (
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
              <Link
                href={
                  currentPage < Math.ceil(total / pageSize)
                    ? `?page=${currentPage + 1}`
                    : "#"
                }
              >
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= Math.ceil(total / pageSize)}
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

function ServiceCard({
  service,
  workspaceId,
  orgId,
}: {
  service: Service;
  workspaceId: string;
  orgId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const Icon = service.type === "trigger" ? Zap : Terminal;
  const iconColor =
    service.type === "trigger" ? "text-amber-500" : "text-[var(--accent)]";
  const handleDelete = () => {
    startTransition(async () => {
      await deleteServiceAction(workspaceId, service.id);
      setIsDeleteModalOpen(false);
    });
  };

  return (
    <>
      <Link
        href={`/org/${orgId}/workspace/${workspaceId}/personal/services/${service.id}`}
      >
        <Card
          hoverable
          className={`group cursor-pointer p-5 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-1 items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded transition-all ${service.type === "trigger" ? "border border-amber-500/15 bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-[0_0_16px_rgba(245,158,11,0.35)]" : "border border-[var(--accent)]/15 bg-[var(--accent)]/10 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-[0_0_16px_var(--accent-glow)]"}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium text-[var(--foreground)]">
                    {service.title}
                  </h3>
                  <HubBadge hubPieceId={service.hubPieceId} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    {service.type}
                  </span>
                  {service.runtime && service.runtime !== "deno" && (
                    <span className="rounded border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--accent)]">
                      {service.runtime}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {service.description}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase ${service.status === "deploying" ? "text-amber-500" : service.status === "stopped" || service.status === "crashed" ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {service.status}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                  <span className="text-[10px] font-medium uppercase text-[var(--muted)]">
                    Ready
                  </span>
                </div>
              </div>
            </div>
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
          </div>
        </Card>
      </Link>
      <ServiceDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        serviceTitle={service.title}
        isPending={isPending}
      />
    </>
  );
}
