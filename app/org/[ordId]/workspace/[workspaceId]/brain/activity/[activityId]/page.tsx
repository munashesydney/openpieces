import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Database, Tag } from "lucide-react";
import { getActivityByIdAction } from "../../actions";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";
import type { ActivityLog } from "@/lib/db/schema";

export default async function ActivityDetailPage(props: {
  params: Promise<{ ordId: string; workspaceId: string; activityId: string }>;
}) {
  const { ordId, workspaceId, activityId } = await props.params;
  await requireWorkspaceOwner(workspaceId);

  const activity: ActivityLog | null = await getActivityByIdAction(
    workspaceId,
    activityId,
  );

  if (!activity) {
    notFound();
  }

  const operation = activity.operation;
  const recordType = activity.recordType;
  const recordId = activity.recordId;
  const oldData = activity.oldData;
  const newData = activity.newData;
  const createdAt = activity.createdAt;
  const id = activity.id;

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date));
  };

  const getOperationColor = (op: string): string => {
    if (op === "INSERT") return "bg-green-500/10 text-green-500";
    if (op === "UPDATE") return "bg-yellow-500/10 text-yellow-500";
    return "bg-red-500/10 text-red-500";
  };

  const getOperationText = (op: string): string => {
    if (op === "INSERT") return "Created";
    if (op === "UPDATE") return "Updated";
    return "Deleted";
  };

  return (
    <div className="w-full px-8 py-8">
      <Link
        href={`/org/${ordId}/workspace/${workspaceId}/brain/activity`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Activity
      </Link>

      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)] mb-1.5">
          Audit Log
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Activity Details
        </h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          View the details of this activity log entry
        </p>
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--sidebar-bg)] p-6">
        <div className="mb-6 flex items-center gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded ${getOperationColor(operation)}`}
          >
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-medium text-[var(--foreground)]">
              {recordType.charAt(0).toUpperCase() + recordType.slice(1)}{" "}
              {getOperationText(operation)}
            </p>
            <p className="text-sm text-[var(--muted)]">ID: {id}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">
                Record Type
              </p>
              <p className="text-sm text-[var(--foreground)]">{recordType}</p>
            </div>
          </div>

          {recordId && (
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">
                  Record ID
                </p>
                <p className="text-sm text-[var(--foreground)] font-mono">
                  {String(recordId)}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">
                Timestamp
              </p>
              <p className="text-sm text-[var(--foreground)]">
                {formatDate(createdAt)}
              </p>
            </div>
          </div>
        </div>

        {oldData != null && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">
              Old Data
            </p>
            <pre className="overflow-auto rounded bg-[var(--hover-bg)] p-4 text-xs text-[var(--foreground)]">
              {JSON.stringify(oldData as object, null, 2)}
            </pre>
          </div>
        )}

        {newData != null && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">
              New Data
            </p>
            <pre className="overflow-auto rounded bg-[var(--hover-bg)] p-4 text-xs text-[var(--foreground)]">
              {JSON.stringify(newData as object, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
