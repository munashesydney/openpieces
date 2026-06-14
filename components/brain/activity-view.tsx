"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Workflow,
  Puzzle,
  Calendar,
  Code,
  Route,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/basic/buttons/button";
import type { ActivityLog } from "../../lib/db/schema";

type SearchMode = "workflows" | "services" | "tasks" | "endpoints" | "opencode";

const modeConfig: Record<
  SearchMode,
  { label: string; icon: typeof Workflow; recordType: string }
> = {
  workflows: { label: "Workflows", icon: Workflow, recordType: "workflow" },
  services: { label: "Services", icon: Puzzle, recordType: "service" },
  tasks: { label: "Tasks", icon: Calendar, recordType: "task" },
  endpoints: { label: "Endpoints", icon: Route, recordType: "endpoint" },
  opencode: { label: "OpenCode", icon: Code, recordType: "opencode" },
};

const PAGE_LIMIT = 50;

interface ActivityViewProps {
  orgId: string;
  workspaceId: string;
  getActivityAction: (
    recordType: string,
    limit?: number,
    offset?: number,
  ) => Promise<ActivityLog[]>;
}

export function ActivityView({
  orgId,
  workspaceId,
  getActivityAction,
}: ActivityViewProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedMode, setSelectedMode] =
    React.useState<SearchMode>("workflows");
  const [activityData, setActivityData] = React.useState<ActivityLog[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const fetchActivity = React.useCallback(
    (recordType: string) => {
      startTransition(async () => {
        const data = await getActivityAction(recordType, PAGE_LIMIT, 0);
        setActivityData(data);
        setOffset(0);
        setHasMore(data.length === PAGE_LIMIT);
      });
    },
    [getActivityAction],
  );

  const handleModeChange = (mode: SearchMode) => {
    setSelectedMode(mode);
  };

  // Fetch activity when mode changes
  React.useEffect(() => {
    fetchActivity(modeConfig[selectedMode].recordType);
  }, [selectedMode, fetchActivity]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const nextOffset = offset + PAGE_LIMIT;
      const data = await getActivityAction(
        modeConfig[selectedMode].recordType,
        PAGE_LIMIT,
        nextOffset,
      );
      setActivityData((prev) => [...prev, ...data]);
      setOffset(nextOffset);
      setHasMore(data.length === PAGE_LIMIT);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatActivityEvent = (activity: ActivityLog): string => {
    const recordType = activity.recordType;
    const operation = activity.operation;

    if (operation === "INSERT") {
      return `${recordType} created`;
    } else if (operation === "UPDATE") {
      return `${recordType} updated`;
    } else {
      return `${recordType} deleted`;
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Mode selector */}
      <div className="flex items-center justify-center gap-1 px-8 pt-8">
        {(Object.keys(modeConfig) as SearchMode[]).map((mode) => {
          const Icon = modeConfig[mode].icon;
          const isActive = selectedMode === mode;
          return (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`flex items-center gap-2 rounded px-4 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {modeConfig[mode].label}
            </button>
          );
        })}
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-auto px-8 pb-8 pt-6">
        <div className="mx-auto max-w-2xl">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : activityData.length > 0 ? (
            <>
              <div className="space-y-2">
                {activityData.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/org/${orgId}/workspace/${workspaceId}/brain/activity/${activity.id}`}
                    className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3 transition-colors hover:bg-[var(--hover-bg)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          activity.operation === "INSERT"
                            ? "bg-green-500"
                            : activity.operation === "UPDATE"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm text-[var(--foreground)]">
                        {formatActivityEvent(activity)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--muted)]">
                        {formatTime(activity.createdAt)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                    </div>
                  </Link>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full max-w-sm flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Logs"
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded bg-[var(--hover-bg)]">
                <Search className="h-6 w-6 text-[var(--muted)]" />
              </div>
              <h3 className="mt-4 text-base font-medium text-[var(--foreground)]">
                No {modeConfig[selectedMode].label.toLowerCase()} activity yet
              </h3>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                Activity will appear here when changes are made
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
