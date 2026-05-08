"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Plus,
  Repeat,
  Timer,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { ActionMenu } from "@/components/basic/input/action-menu";
import { Dropdown } from "@/components/basic/input/dropdown";
import { Textarea } from "@/components/basic/input/textarea";
import {
  createTaskAction,
  pauseTaskAction,
  resumeTaskAction,
  completeTaskAction,
  deleteTaskAction,
} from "@/app/workspace/[workspaceId]/personal/tasks/actions";
import { type Task, type Workflow } from "@/lib/db/schema";
import { TaskDeleteModal } from "./task-delete-modal";

const WEEKDAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const INTERVAL_OPTIONS = [
  { label: "Every N minutes", value: "minutes" },
  { label: "Every N hours", value: "hours" },
  { label: "Daily at specific time", value: "daily" },
  { label: "Weekly on specific day", value: "weekly" },
  { label: "Monthly on specific date", value: "monthly" },
];

function formatSchedule(task: Task): string {
  if (task.type === "one-time" && task.scheduledAt) {
    const date = new Date(task.scheduledAt);
    return date.toLocaleString();
  }
  if (task.type === "recurring") {
    const { intervalType, intervalValue, dayOfWeek, dayOfMonth, timeOfDay } =
      task;
    if (intervalType === "minutes" && intervalValue) {
      const base = `Every ${intervalValue} minute${intervalValue > 1 ? "s" : ""}`;
      if (task.timeWindowStart && task.timeWindowEnd) {
        return `${base} (${task.timeWindowStart}–${task.timeWindowEnd})`;
      }
      return base;
    }
    if (intervalType === "hours" && intervalValue) {
      const base = `Every ${intervalValue} hour${intervalValue > 1 ? "s" : ""}`;
      if (task.timeWindowStart && task.timeWindowEnd) {
        return `${base} (${task.timeWindowStart}–${task.timeWindowEnd})`;
      }
      return base;
    }
    if (intervalType === "daily" && timeOfDay) {
      return `Daily at ${timeOfDay}`;
    }
    if (intervalType === "weekly" && dayOfWeek !== null && timeOfDay) {
      const day = WEEKDAYS.find((d) => d.value === dayOfWeek)?.label || "";
      return `Every ${day} at ${timeOfDay}`;
    }
    if (intervalType === "monthly" && dayOfMonth && timeOfDay) {
      return `Monthly on the ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)} at ${timeOfDay}`;
    }
    return "Recurring";
  }
  return "Unknown";
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function TasksList({
  initialTasks,
  workspaceId,
  workflows,
  total,
  currentPage,
  pageSize,
}: {
  initialTasks: Task[];
  workspaceId: string;
  workflows: Workflow[];
  total: number;
  currentPage: number;
  pageSize: number;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [taskType, setTaskType] = useState<"one-time" | "recurring">(
    "one-time",
  );
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // One-time scheduling
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Recurring scheduling
  const [intervalType, setIntervalType] = useState<string>("daily");
  const [intervalValue, setIntervalValue] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [timeWindowEnabled, setTimeWindowEnabled] = useState(false);
  const [timeWindowStart, setTimeWindowStart] = useState("09:00");
  const [timeWindowEnd, setTimeWindowEnd] = useState("17:00");
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const recurringTasks = initialTasks.filter((t) => t.type === "recurring");
  const upcomingTasks = initialTasks.filter(
    (t) => t.type === "one-time" && t.status !== "completed",
  );
  const completedTasks = initialTasks.filter((t) => t.status === "completed");

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !selectedWorkflow) return;

    setFormError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("type", taskType);

    if (taskType === "one-time") {
      // Combine date and time into ISO string
      if (scheduledDate && scheduledTime) {
        const scheduledAt = new Date(
          `${scheduledDate}T${scheduledTime}:00`,
        ).toISOString();
        formData.append("scheduledAt", scheduledAt);
      }
    } else {
      // Recurring task
      formData.append("intervalType", intervalType);
      formData.append("timeOfDay", timeOfDay);
      formData.append(
        "timezone",
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      if (intervalType === "minutes" || intervalType === "hours") {
        formData.append("intervalValue", intervalValue.toString());
      }
      if (intervalType === "weekly") {
        formData.append("dayOfWeek", dayOfWeek.toString());
      }
      if (intervalType === "monthly") {
        formData.append("dayOfMonth", dayOfMonth.toString());
      }

      // Time window (for minutes/hours intervals)
      formData.append("timeWindowEnabled", String(timeWindowEnabled));
      if (timeWindowEnabled) {
        formData.append("timeWindowStart", timeWindowStart);
        formData.append("timeWindowEnd", timeWindowEnd);
      }
    }

    formData.append("status", "active");

    startTransition(async () => {
      const result = await createTaskAction(workspaceId, formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setIsSheetOpen(false);
      setTitle("");
      setDescription("");
      setTaskType("one-time");
      setSelectedWorkflow("");
      setScheduledDate("");
      setScheduledTime("");
      setIntervalType("daily");
      setIntervalValue(1);
      setDayOfWeek(0);
      setDayOfMonth(1);
      setTimeOfDay("09:00");
      setTimeWindowEnabled(false);
      setTimeWindowStart("09:00");
      setTimeWindowEnd("17:00");
      setFormError(null);
    });
  };

  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    startTransition(async () => {
      await deleteTaskAction(workspaceId, taskToDelete.id);
      setTaskToDelete(null);
    });
  };

  const StatusAction = ({
    task,
    onDeleteRequest,
  }: {
    task: Task;
    onDeleteRequest: (task: Task) => void;
  }) => {
    return (
      <ActionMenu
        onSelect={(val) => {
          if (val === "delete") {
            onDeleteRequest(task);
            return;
          }
          startTransition(async () => {
            if (val === "pause") await pauseTaskAction(workspaceId, task.id);
            if (val === "resume") await resumeTaskAction(workspaceId, task.id);
            if (val === "complete")
              await completeTaskAction(workspaceId, task.id);
          });
        }}
        options={[
          ...(task.status === "active"
            ? [
                {
                  label: "Pause",
                  value: "pause",
                  icon: <Pause className="h-4 w-4" />,
                },
              ]
            : []),
          ...(task.status === "paused"
            ? [
                {
                  label: "Resume",
                  value: "resume",
                  icon: <Play className="h-4 w-4" />,
                },
              ]
            : []),
          ...(task.status !== "completed"
            ? [
                {
                  label: "Mark Completed",
                  value: "complete",
                  icon: <CheckCircle2 className="h-4 w-4" />,
                },
              ]
            : []),
          {
            label: "Delete",
            value: "delete",
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true,
          },
        ]}
      />
    );
  };

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Tasks
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Manage your one-time and recurring scheduled actions.
            </p>
          </div>
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* New Task Sheet */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setFormError(null);
          }}
          title="Create New Task"
          description="Schedule a new action or recurring workflow."
          footer={<></>} // Handled inside form
        >
          <form className="space-y-6" onSubmit={handleCreateTask}>
            <div className="space-y-6">
              <Input
                name="title"
                label="Task Title"
                placeholder="e.g. Weekly Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Dropdown
                label="Workflow (Required)"
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
                placeholder="What should this task do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Task Type Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Task Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="taskType"
                      value="one-time"
                      checked={taskType === "one-time"}
                      onChange={() => setTaskType("one-time")}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      One-time
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="taskType"
                      value="recurring"
                      checked={taskType === "recurring"}
                      onChange={() => setTaskType("recurring")}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      Recurring
                    </span>
                  </label>
                </div>
              </div>

              {/* One-time Scheduling */}
              {taskType === "one-time" && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required={taskType === "one-time"}
                  />
                  <Input
                    type="time"
                    label="Time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required={taskType === "one-time"}
                  />
                </div>
              )}

              {/* Recurring Scheduling */}
              {taskType === "recurring" && (
                <div className="space-y-4">
                  <Dropdown
                    label="Repeat"
                    value={intervalType}
                    onChange={setIntervalType}
                    options={INTERVAL_OPTIONS}
                  />

                  {/* Every N minutes/hours */}
                  {intervalType === "minutes" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--muted)]">Every</span>
                      <input
                        type="number"
                        min="1"
                        max="59"
                        value={intervalValue}
                        onChange={(e) =>
                          setIntervalValue(parseInt(e.target.value) || 1)
                        }
                        className="w-20 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                      />
                      <span className="text-sm text-[var(--muted)]">
                        minute(s)
                      </span>
                    </div>
                  )}

                  {intervalType === "hours" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--muted)]">Every</span>
                      <input
                        type="number"
                        min="1"
                        max="23"
                        value={intervalValue}
                        onChange={(e) =>
                          setIntervalValue(parseInt(e.target.value) || 1)
                        }
                        className="w-20 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                      />
                      <span className="text-sm text-[var(--muted)]">
                        hour(s)
                      </span>
                    </div>
                  )}

                  {/* Time window toggle (for minutes/hours) */}
                  {(intervalType === "minutes" || intervalType === "hours") && (
                    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/40 p-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timeWindowEnabled}
                          onChange={(e) =>
                            setTimeWindowEnabled(e.target.checked)
                          }
                          className="accent-[var(--accent)]"
                        />
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          Restrict to time window
                        </span>
                      </label>
                      {timeWindowEnabled && (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <Input
                            type="time"
                            label="From"
                            value={timeWindowStart}
                            onChange={(e) => setTimeWindowStart(e.target.value)}
                          />
                          <Input
                            type="time"
                            label="To"
                            value={timeWindowEnd}
                            onChange={(e) => setTimeWindowEnd(e.target.value)}
                          />
                        </div>
                      )}
                      {timeWindowEnabled && (
                        <p className="pl-6 text-xs text-[var(--muted)]">
                          Task will only run between{" "}
                          <strong>{timeWindowStart}</strong> and{" "}
                          <strong>{timeWindowEnd}</strong>, respecting your
                          workspace timezone.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Daily - just time */}
                  {intervalType === "daily" && (
                    <Input
                      type="time"
                      label="Time of day"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                    />
                  )}

                  {/* Weekly - day of week + time */}
                  {intervalType === "weekly" && (
                    <div className="space-y-4">
                      <Dropdown
                        label="Day of week"
                        value={dayOfWeek.toString()}
                        onChange={(v) => setDayOfWeek(parseInt(v))}
                        options={WEEKDAYS.map((d) => ({
                          label: d.label,
                          value: d.value.toString(),
                        }))}
                      />
                      <Input
                        type="time"
                        label="Time of day"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Monthly - day of month + time */}
                  {intervalType === "monthly" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--muted)]">
                          On day
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={dayOfMonth}
                          onChange={(e) =>
                            setDayOfMonth(parseInt(e.target.value) || 1)
                          }
                          className="w-20 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                        />
                        <span className="text-sm text-[var(--muted)]">
                          of each month
                        </span>
                      </div>
                      <Input
                        type="time"
                        label="Time of day"
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
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
                disabled={isPending || !title || !selectedWorkflow}
              >
                {isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Sheet>

        {/* Recurring Tasks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Repeat className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Recurring
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recurringTasks.map((task) => (
              <Card key={task.id} hoverable className="group p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-[var(--foreground)]">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {task.description}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--accent)]">
                          <Timer className="h-3 w-3" />
                          {formatSchedule(task)}
                        </div>
                        <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span
                          className={`text-[10px] font-bold uppercase ${task.status === "active" ? "text-emerald-500" : "text-amber-500"}`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusAction
                      task={task}
                      onDeleteRequest={setTaskToDelete}
                    />
                  </div>
                </div>
              </Card>
            ))}
            {recurringTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                No recurring tasks found.
              </div>
            )}
          </div>
        </section>

        {/* Upcoming One-time Tasks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Upcoming
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {upcomingTasks.map((task) => (
              <Card key={task.id} hoverable className="group p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hover-bg)] text-[var(--muted)]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-[var(--foreground)]">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {task.description}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] font-bold uppercase text-[var(--muted)]">
                        <span>One-time</span>
                        {task.scheduledAt && (
                          <>
                            <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                            <span>{formatSchedule(task)}</span>
                          </>
                        )}
                        <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span
                          className={
                            task.status === "active"
                              ? "text-emerald-500 text-[10px] font-bold uppercase"
                              : "text-amber-500 text-[10px] font-bold uppercase"
                          }
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusAction
                      task={task}
                      onDeleteRequest={setTaskToDelete}
                    />
                  </div>
                </div>
              </Card>
            ))}
            {upcomingTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
                No upcoming tasks found.
              </div>
            )}
          </div>
        </section>

        {/* Completed Tasks (Simplified) */}
        {completedTasks.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Recently Completed
            </h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-4 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.scheduledAt && (
                      <span className="text-[10px] font-bold uppercase text-[var(--muted)]">
                        {formatSchedule(task)}
                      </span>
                    )}
                    <div className="shrink-0">
                      <StatusAction
                        task={task}
                        onDeleteRequest={setTaskToDelete}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
              tasks
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
        <TaskDeleteModal
          isOpen={taskToDelete !== null}
          onClose={() => setTaskToDelete(null)}
          onConfirm={handleDeleteTask}
          taskTitle={taskToDelete?.title ?? ""}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
