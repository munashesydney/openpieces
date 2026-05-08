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
  Pencil,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { ActionMenu } from "@/components/basic/input/action-menu";
import {
  createTaskAction,
  updateTaskAction,
  pauseTaskAction,
  resumeTaskAction,
  completeTaskAction,
  deleteTaskAction,
} from "@/app/workspace/[workspaceId]/personal/tasks/actions";
import { type Task, type Workflow } from "@/lib/db/schema";
import { TaskDeleteModal } from "./task-delete-modal";
import { TaskAddEditSheet } from "./task-add-edit-sheet";

const WEEKDAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

function formatDays(runOnDays: number[] | null | undefined): string {
  if (!runOnDays || runOnDays.length === 0) return "";
  const labels = runOnDays
    .sort()
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label.slice(0, 3) ?? "");
  return ` [${labels.join(", ")}]`;
}

function formatSchedule(task: Task): string {
  if (task.type === "one-time" && task.scheduledAt) {
    const date = new Date(task.scheduledAt);
    return date.toLocaleString();
  }
  if (task.type === "recurring") {
    const { intervalType, intervalValue, dayOfWeek, dayOfMonth, timeOfDay } =
      task;
    const daysSuffix = formatDays(task.runOnDays);
    if (intervalType === "minutes" && intervalValue) {
      let s = `Every ${intervalValue} minute${intervalValue > 1 ? "s" : ""}`;
      if (task.timeWindowStart && task.timeWindowEnd) {
        s += ` (${task.timeWindowStart}–${task.timeWindowEnd})`;
      }
      return s + daysSuffix;
    }
    if (intervalType === "hours" && intervalValue) {
      let s = `Every ${intervalValue} hour${intervalValue > 1 ? "s" : ""}`;
      if (task.timeWindowStart && task.timeWindowEnd) {
        s += ` (${task.timeWindowStart}–${task.timeWindowEnd})`;
      }
      return s + daysSuffix;
    }
    if (intervalType === "daily" && timeOfDay) {
      return `Daily at ${timeOfDay}` + daysSuffix;
    }
    if (intervalType === "weekly" && dayOfWeek !== null && timeOfDay) {
      const day = WEEKDAYS.find((d) => d.value === dayOfWeek)?.label || "";
      return `Every ${day} at ${timeOfDay}` + daysSuffix;
    }
    if (intervalType === "monthly" && dayOfMonth && timeOfDay) {
      return (
        `Monthly on the ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)} at ${timeOfDay}` +
        daysSuffix
      );
    }
    return "Recurring" + daysSuffix;
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
  const [runOnDays, setRunOnDays] = useState<number[]>([]);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

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

      // Days of week
      formData.append("runOnDays", JSON.stringify(runOnDays));
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
      setRunOnDays([]);
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

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWorkflowId, setEditWorkflowId] = useState("");
  const [editTaskType, setEditTaskType] = useState<"one-time" | "recurring">(
    "one-time",
  );
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [editIntervalType, setEditIntervalType] = useState<string>("daily");
  const [editIntervalValue, setEditIntervalValue] = useState(1);
  const [editDayOfWeek, setEditDayOfWeek] = useState(0);
  const [editDayOfMonth, setEditDayOfMonth] = useState(1);
  const [editTimeOfDay, setEditTimeOfDay] = useState("09:00");
  const [editTimeWindowEnabled, setEditTimeWindowEnabled] = useState(false);
  const [editTimeWindowStart, setEditTimeWindowStart] = useState("09:00");
  const [editTimeWindowEnd, setEditTimeWindowEnd] = useState("17:00");
  const [editRunOnDays, setEditRunOnDays] = useState<number[]>([]);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const openEditSheet = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditWorkflowId(task.workflowId ?? "");
    setEditTaskType(task.type);

    // One-time fields
    if (task.type === "one-time" && task.scheduledAt) {
      const d = new Date(task.scheduledAt);
      setEditScheduledDate(d.toISOString().slice(0, 10));
      setEditScheduledTime(d.toISOString().slice(11, 16));
    } else {
      setEditScheduledDate("");
      setEditScheduledTime("");
    }

    // Recurring fields
    if (task.type === "recurring") {
      setEditIntervalType(task.intervalType ?? "daily");
      setEditIntervalValue(task.intervalValue ?? 1);
      setEditDayOfWeek(task.dayOfWeek ?? 0);
      setEditDayOfMonth(task.dayOfMonth ?? 1);
      setEditTimeOfDay(task.timeOfDay ?? "09:00");
      const hasWindow = !!(task.timeWindowStart && task.timeWindowEnd);
      setEditTimeWindowEnabled(hasWindow);
      setEditTimeWindowStart(task.timeWindowStart ?? "09:00");
      setEditTimeWindowEnd(task.timeWindowEnd ?? "17:00");
      setEditRunOnDays(
        Array.isArray(task.runOnDays) ? [...task.runOnDays] : [],
      );
    } else {
      setEditIntervalType("daily");
      setEditIntervalValue(1);
      setEditDayOfWeek(0);
      setEditDayOfMonth(1);
      setEditTimeOfDay("09:00");
      setEditTimeWindowEnabled(false);
      setEditTimeWindowStart("09:00");
      setEditTimeWindowEnd("17:00");
      setEditRunOnDays([]);
    }

    setEditFormError(null);
    setIsEditSheetOpen(true);
  };

  const handleEditTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask || !editTitle || !editWorkflowId) return;

    setEditFormError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", editTaskType);

    if (editTaskType === "one-time") {
      if (editScheduledDate && editScheduledTime) {
        const scheduledAt = new Date(
          `${editScheduledDate}T${editScheduledTime}:00`,
        ).toISOString();
        formData.set("scheduledAt", scheduledAt);
      }
    } else {
      formData.set("intervalType", editIntervalType);
      formData.set("timeOfDay", editTimeOfDay);
      formData.set(
        "timezone",
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      if (editIntervalType === "minutes" || editIntervalType === "hours") {
        formData.set("intervalValue", editIntervalValue.toString());
      }
      if (editIntervalType === "weekly") {
        formData.set("dayOfWeek", editDayOfWeek.toString());
      }
      if (editIntervalType === "monthly") {
        formData.set("dayOfMonth", editDayOfMonth.toString());
      }
      formData.set("timeWindowEnabled", String(editTimeWindowEnabled));
      if (editTimeWindowEnabled) {
        formData.set("timeWindowStart", editTimeWindowStart);
        formData.set("timeWindowEnd", editTimeWindowEnd);
      }

      // Days of week
      formData.set("runOnDays", JSON.stringify(editRunOnDays));
    }

    startTransition(async () => {
      const result = await updateTaskAction(
        workspaceId,
        editingTask.id,
        formData,
      );
      if ("error" in result) {
        setEditFormError(result.error);
        return;
      }
      setIsEditSheetOpen(false);
      setEditingTask(null);
      setEditFormError(null);
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
          if (val === "edit") {
            openEditSheet(task);
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
          {
            label: "Edit",
            value: "edit",
            icon: <Pencil className="h-4 w-4" />,
          },
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
        <TaskAddEditSheet
          mode="add"
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setFormError(null);
          }}
          values={{
            title,
            description,
            workflowId: selectedWorkflow,
            taskType,
            scheduledDate,
            scheduledTime,
            intervalType,
            intervalValue,
            dayOfWeek,
            dayOfMonth,
            timeOfDay,
            timeWindowEnabled,
            timeWindowStart,
            timeWindowEnd,
            runOnDays,
          }}
          onChange={{
            title: setTitle,
            description: setDescription,
            workflowId: setSelectedWorkflow,
            taskType: setTaskType as (val: "one-time" | "recurring") => void,
            scheduledDate: setScheduledDate,
            scheduledTime: setScheduledTime,
            intervalType: setIntervalType,
            intervalValue: setIntervalValue,
            dayOfWeek: setDayOfWeek,
            dayOfMonth: setDayOfMonth,
            timeOfDay: setTimeOfDay,
            timeWindowEnabled: setTimeWindowEnabled,
            timeWindowStart: setTimeWindowStart,
            timeWindowEnd: setTimeWindowEnd,
            runOnDays: setRunOnDays,
          }}
          onSubmit={handleCreateTask}
          formError={formError}
          isPending={isPending}
          workflows={workflows}
        />

        {/* Edit Task Sheet */}
        <TaskAddEditSheet
          mode="edit"
          isOpen={isEditSheetOpen}
          onClose={() => {
            setIsEditSheetOpen(false);
            setEditingTask(null);
            setEditFormError(null);
          }}
          values={{
            title: editTitle,
            description: editDescription,
            workflowId: editWorkflowId,
            taskType: editTaskType,
            scheduledDate: editScheduledDate,
            scheduledTime: editScheduledTime,
            intervalType: editIntervalType,
            intervalValue: editIntervalValue,
            dayOfWeek: editDayOfWeek,
            dayOfMonth: editDayOfMonth,
            timeOfDay: editTimeOfDay,
            timeWindowEnabled: editTimeWindowEnabled,
            timeWindowStart: editTimeWindowStart,
            timeWindowEnd: editTimeWindowEnd,
            runOnDays: editRunOnDays,
          }}
          onChange={{
            title: setEditTitle,
            description: setEditDescription,
            workflowId: setEditWorkflowId,
            taskType: setEditTaskType as (
              val: "one-time" | "recurring",
            ) => void,
            scheduledDate: setEditScheduledDate,
            scheduledTime: setEditScheduledTime,
            intervalType: setEditIntervalType,
            intervalValue: setEditIntervalValue,
            dayOfWeek: setEditDayOfWeek,
            dayOfMonth: setEditDayOfMonth,
            timeOfDay: setEditTimeOfDay,
            timeWindowEnabled: setEditTimeWindowEnabled,
            timeWindowStart: setEditTimeWindowStart,
            timeWindowEnd: setEditTimeWindowEnd,
            runOnDays: setEditRunOnDays,
          }}
          onSubmit={handleEditTask}
          formError={editFormError}
          isPending={isPending}
          workflows={workflows}
        />

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
