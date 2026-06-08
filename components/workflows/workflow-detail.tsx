"use client";

import { useState, useTransition } from "react";
import {
  ChevronLeft,
  Zap,
  Terminal,
  Repeat,
  Calendar,
  Trash2,
  Plus,
  Unlink,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { ActionMenu } from "@/components/basic/input/action-menu";
import { Sheet } from "../ui/sheet";
import { Dropdown } from "@/components/basic/input/dropdown";
import { type Workflow, type Service, type Task } from "@/lib/db/schema";
import {
  deleteWorkflowAction,
  linkActionServiceToWorkflowAction,
  unlinkActionServiceFromWorkflowAction,
} from "@/app/org/[ordId]/workspace/[workspaceId]/personal/workflows/actions";
import Link from "next/link";
import { WorkflowDeleteModal } from "./workflow-delete-modal";
import { WorkflowSteps } from "./workflow-steps";
import { PushWorkflowToHubButton } from "./push-workflow-to-hub-button";
import { PullWorkflowFromHubButton } from "./pull-workflow-from-hub-button";
import { WorkflowHubBadge } from "./workflow-hub-badge";

interface WorkflowDetailProps {
  workflow: Workflow;
  workspaceId: string;
  orgId: string;
  triggerServices: Service[];
  tasks: Task[];
  linkedActionServices: Service[];
  availableActionServices: Service[];
}

export function WorkflowDetail({
  workflow,
  workspaceId,
  orgId,
  triggerServices,
  tasks,
  linkedActionServices,
  availableActionServices,
}: WorkflowDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLinkSheetOpen, setIsLinkSheetOpen] = useState(false);
  const [selectedActionServiceId, setSelectedActionServiceId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const handleDelete = () => {
    startTransition(async () => {
      await deleteWorkflowAction(workspaceId, workflow.id);
      router.push(`/org/${orgId}/workspace/${workspaceId}/personal/workflows`);
    });
  };

  const handleLinkActionService = async () => {
    if (!selectedActionServiceId) return;
    setLinkError(null);
    startTransition(async () => {
      const result = await linkActionServiceToWorkflowAction(
        workspaceId,
        workflow.id,
        selectedActionServiceId,
      );
      if ("error" in result) {
        setLinkError(result.error);
        return;
      }
      setIsLinkSheetOpen(false);
      setSelectedActionServiceId("");
      setLinkError(null);
    });
  };

  const handleUnlinkActionService = (actionServiceId: string) => {
    startTransition(async () => {
      await unlinkActionServiceFromWorkflowAction(
        workspaceId,
        workflow.id,
        actionServiceId,
      );
    });
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10 font-Inter">
      <div className="w-full px-4 space-y-10">
        {/* Navigation & Header */}
        <div className="space-y-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Workflows
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
                  {workflow.title}
                </h1>
                <WorkflowHubBadge hubWorkflowId={workflow.hubWorkflowId} />
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    workflow.status === "active"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : workflow.status === "archived"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {workflow.status}
                </span>
              </div>
              {workflow.description && (
                <p className="text-sm text-[var(--muted)]">
                  {workflow.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {/* Hub push/pull */}
              <PushWorkflowToHubButton
                workspaceId={workspaceId}
                workflowId={workflow.id}
                orgId={orgId}
              />
              <PullWorkflowFromHubButton
                workspaceId={workspaceId}
                existingWorkflowId={workflow.id}
                orgId={orgId}
              />
              <Link
                href={`/org/${orgId}/workspace/${workspaceId}/personal/workflows/${workflow.id}/executions`}
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Executions
                </Button>
              </Link>
              <ActionMenu
                onSelect={(val) => {
                  if (val === "delete") setIsDeleteModalOpen(true);
                }}
                options={[
                  {
                    label: "Delete Workflow",
                    value: "delete",
                    icon: <Trash2 className="h-4 w-4" />,
                    destructive: true,
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <WorkflowDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          workflowTitle={workflow.title}
          isPending={isPending}
        />

        <WorkflowSteps
          workflowId={workflow.id}
          workspaceId={workspaceId}
          steps={workflow.detailedSteps ?? []}
        />

        {/* Triggers: trigger services + tasks */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Triggers
            </h2>
          </div>

          {triggerServices.length === 0 && tasks.length === 0 ? (
            <EmptySlot label="No triggers or tasks linked to this workflow." />
          ) : (
            <div className="space-y-6">
              {/* Service Triggers */}
              <div className="space-y-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] opacity-50">
                  Service Triggers
                </p>
                {triggerServices.length === 0 ? (
                  <EmptySlot label="No service triggers." />
                ) : (
                  <div className="flex flex-col gap-4">
                    {triggerServices.map((s) => (
                      <ServiceRow
                        key={s.id}
                        service={s}
                        workspaceId={workspaceId}
                        orgId={orgId}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Task Triggers */}
              <div className="space-y-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] opacity-50">
                  Task Triggers
                </p>
                {tasks.length === 0 ? (
                  <EmptySlot label="No task triggers." />
                ) : (
                  <div className="flex flex-col gap-4">
                    {tasks.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions: linked action services */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                Actions
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setIsLinkSheetOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Link Action
            </Button>
          </div>

          {/* Link Action Sheet */}
          <Sheet
            isOpen={isLinkSheetOpen}
            onClose={() => {
              setIsLinkSheetOpen(false);
              setLinkError(null);
              setSelectedActionServiceId("");
            }}
            title="Link Action Service"
            description="Select an action service to link to this workflow."
            footer={<></>}
          >
            <div className="space-y-6">
              <Dropdown
                label="Action Service"
                value={selectedActionServiceId}
                onChange={setSelectedActionServiceId}
                options={[
                  { label: "Select an action service...", value: "" },
                  ...availableActionServices
                    .filter(
                      (s) =>
                        !linkedActionServices.some(
                          (linked) => linked.id === s.id,
                        ),
                    )
                    .map((s) => ({ label: s.title, value: s.id })),
                ]}
              />

              {linkError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {linkError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsLinkSheetOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkActionService}
                  disabled={isPending || !selectedActionServiceId}
                >
                  {isPending ? "Linking..." : "Link Action"}
                </Button>
              </div>
            </div>
          </Sheet>

          {linkedActionServices.length === 0 ? (
            <EmptySlot label="No actions linked to this workflow." />
          ) : (
            <div className="flex flex-col gap-4">
              {linkedActionServices.map((s) => (
                <LinkedActionRow
                  key={s.id}
                  service={s}
                  workspaceId={workspaceId}
                  orgId={orgId}
                  onUnlink={() => handleUnlinkActionService(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
      {label}
    </div>
  );
}

function ServiceRow({
  service,
  workspaceId,
  orgId,
}: {
  service: Service;
  workspaceId: string;
  orgId: string;
}) {
  const Icon = service.type === "trigger" ? Zap : Terminal;
  const iconColor =
    service.type === "trigger" ? "text-amber-500" : "text-[var(--accent)]";
  const iconBg =
    service.type === "trigger"
      ? "bg-amber-500/10"
      : "bg-[var(--accent-glow)]/10";

  return (
    <Link
      href={`/org/${orgId}/workspace/${workspaceId}/personal/services/${service.id}`}
    >
      <Card hoverable className="cursor-pointer p-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {service.title}
            </p>
            {service.description && (
              <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                {service.description}
              </p>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {service.type}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function TaskRow({ task }: { task: Task }) {
  const Icon = task.type === "recurring" ? Repeat : Calendar;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--hover-bg)] text-[var(--muted)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-[var(--muted)] truncate mt-0.5">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              task.status === "active"
                ? "text-emerald-500"
                : task.status === "paused"
                  ? "text-amber-500"
                  : "text-[var(--muted)]"
            }`}
          >
            {task.status}
          </span>
        </div>
      </div>
    </Card>
  );
}

function LinkedActionRow({
  service,
  workspaceId,
  orgId,
  onUnlink,
}: {
  service: Service;
  workspaceId: string;
  orgId: string;
  onUnlink: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card
      hoverable
      className={`p-4 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-glow)]/10 text-[var(--accent)]">
          <Terminal className="h-4 w-4" />
        </div>
        <Link
          href={`/org/${orgId}/workspace/${workspaceId}/personal/services/${service.id}`}
          className="flex-1 min-w-0"
        >
          <p className="text-sm font-medium text-[var(--foreground)] truncate">
            {service.title}
          </p>
          {service.description && (
            <p className="text-xs text-[var(--muted)] truncate mt-0.5">
              {service.description}
            </p>
          )}
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          action
        </span>
        <ActionMenu
          onSelect={(val) => {
            if (val === "unlink") {
              startTransition(onUnlink);
            }
          }}
          options={[
            {
              label: "Unlink",
              value: "unlink",
              icon: <Unlink className="h-4 w-4" />,
              destructive: true,
            },
          ]}
        />
      </div>
    </Card>
  );
}
