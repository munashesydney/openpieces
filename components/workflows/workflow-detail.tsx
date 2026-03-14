"use client";

import { useTransition } from "react";
import {
  ChevronLeft,
  Zap,
  Terminal,
  Repeat,
  Calendar,
  Play,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { ActionMenu } from "@/components/basic/input/action-menu";
import { type Workflow, type Service, type Task } from "@/lib/db/schema";
import { deleteWorkflowAction } from "@/app/workspace/[workspaceId]/personal/workflows/actions";
import Link from "next/link";

interface WorkflowDetailProps {
  workflow: Workflow;
  workspaceId: string;
  services: Service[];
  tasks: Task[];
}

export function WorkflowDetail({
  workflow,
  workspaceId,
  services,
  tasks,
}: WorkflowDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteWorkflowAction(workspaceId, workflow.id);
      router.push(`/workspace/${workspaceId}/personal/workflows`);
    });
  };

  // Triggers = trigger-type services + all tasks
  const triggerServices = services.filter((s) => s.type === "trigger");
  const actionServices = services.filter((s) => s.type === "action");

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10 font-Inter">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Navigation & Header */}
        <div className="space-y-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Workflows
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">{workflow.title}</h1>
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
                <p className="text-sm text-[var(--muted)]">{workflow.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ActionMenu
                onSelect={(val) => {
                  if (val === "delete") handleDelete();
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
              <Button className="gap-2" disabled={isPending}>
                <Play className="h-4 w-4 fill-current" />
                Run Workflow
              </Button>
            </div>
          </div>
        </div>

        {/* Triggers: trigger services + tasks */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Triggers</h2>
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
                      <ServiceRow key={s.id} service={s} workspaceId={workspaceId} />
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

        {/* Actions: action services only */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Terminal className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Actions</h2>
          </div>

          {actionServices.length === 0 ? (
            <EmptySlot label="No actions linked to this workflow." />
          ) : (
            <div className="flex flex-col gap-4">
              {actionServices.map((s) => (
                <ServiceRow key={s.id} service={s} workspaceId={workspaceId} />
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
}: {
  service: Service;
  workspaceId: string;
}) {
  const Icon = service.type === "trigger" ? Zap : Terminal;
  const iconColor =
    service.type === "trigger" ? "text-amber-500" : "text-[var(--accent)]";
  const iconBg =
    service.type === "trigger"
      ? "bg-amber-500/10"
      : "bg-[var(--accent-glow)]/10";

  return (
    <Link href={`/workspace/${workspaceId}/personal/services/${service.id}`}>
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
          {task.frequency && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
              {task.frequency}
            </span>
          )}
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
