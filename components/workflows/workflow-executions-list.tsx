"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { type WorkflowExecution } from "@/lib/db/schema";

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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  running: {
    label: "Running",
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: AlertCircle,
    color: "text-[var(--muted)]",
    bg: "bg-[var(--border)]/50",
    border: "border-[var(--border)]",
  },
};

const PAGE_SIZE = 10;

export function WorkflowExecutionsList({
  executions,
  workflowId,
  workspaceId,
}: {
  executions: WorkflowExecution[];
  workflowId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(executions.length / PAGE_SIZE);
  const paginatedExecutions = executions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

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
            Back to Workflow
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-[var(--accent)]" />
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Workflow Executions
              </h1>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              View the execution history for this workflow.
            </p>
          </div>
        </div>

        {/* Executions List */}
        <div className="space-y-4">
          {executions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--muted)]">
              <div className="mb-3 flex justify-center">
                <Play className="h-8 w-8 text-[var(--border)]" />
              </div>
              <p className="font-medium text-[var(--foreground)]">
                No executions yet
              </p>
              <p className="mt-1">
                This workflow hasn&apos;t been executed yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {paginatedExecutions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {executions.length > 0 && (
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-[var(--muted)]">
              Showing{" "}
              <span className="font-medium text-[var(--foreground)]">
                {(page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-[var(--foreground)]">
                {Math.min(page * PAGE_SIZE, executions.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[var(--foreground)]">
                {executions.length}
              </span>{" "}
              records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={p === page ? "primary" : "outline"}
                      size="icon"
                      className="text-sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionCard({ execution }: { execution: WorkflowExecution }) {
  const config = statusConfig[execution.status];
  const StatusIcon = config.icon;
  const isRunning = execution.status === "running";
  const router = useRouter();
  const params = useParams<{ ordId: string; workspaceId: string }>();

  const handleClick = () => {
    if (execution.chatId) {
      router.push(
        `/org/${params.ordId}/workspace/${params.workspaceId}/personal?chat=${execution.chatId}`,
      );
    }
  };

  return (
    <Card
      className={`overflow-hidden border border-[var(--border)] ${execution.chatId ? "cursor-pointer hover:bg-[var(--hover-bg)]/50 transition-colors" : ""}`}
      onClick={handleClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg} ${config.color}`}
            >
              <StatusIcon
                className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {config.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}
                >
                  {execution.triggerType === "internal_chat"
                    ? "Chat"
                    : execution.triggerType === "event"
                      ? "Event"
                      : "Task"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                <span>Started {timeAgo(new Date(execution.createdAt))}</span>
                <span>{formatDate(new Date(execution.createdAt))}</span>
                {execution.updatedAt !== execution.createdAt && (
                  <span>Updated {timeAgo(new Date(execution.updatedAt))}</span>
                )}
              </div>
              {execution.result && (
                <p className="text-sm text-[var(--foreground)] mt-2 line-clamp-3 whitespace-pre-wrap rounded-lg bg-[var(--hover-bg)] p-3 font-mono text-xs leading-relaxed">
                  {execution.result}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
