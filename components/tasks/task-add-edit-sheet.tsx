"use client";

import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { Dropdown } from "@/components/basic/input/dropdown";
import { Textarea } from "@/components/basic/input/textarea";
import type { Workflow } from "@/lib/db/schema";

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

export interface TaskFormValues {
  title: string;
  description: string;
  workflowId: string;
  taskType: "one-time" | "recurring";
  scheduledDate: string;
  scheduledTime: string;
  intervalType: string;
  intervalValue: number;
  dayOfWeek: number;
  dayOfMonth: number;
  timeOfDay: string;
  timeWindowEnabled: boolean;
  timeWindowStart: string;
  timeWindowEnd: string;
  runOnDays: number[];
}

interface TaskAddEditSheetProps {
  mode: "add" | "edit";
  isOpen: boolean;
  onClose: () => void;
  /** The form values to bind */
  values: TaskFormValues;
  /** Called when any form field changes */
  onChange: {
    title: (val: string) => void;
    description: (val: string) => void;
    workflowId: (val: string) => void;
    taskType: (val: "one-time" | "recurring") => void;
    scheduledDate: (val: string) => void;
    scheduledTime: (val: string) => void;
    intervalType: (val: string) => void;
    intervalValue: (val: number) => void;
    dayOfWeek: (val: number) => void;
    dayOfMonth: (val: number) => void;
    timeOfDay: (val: string) => void;
    timeWindowEnabled: (val: boolean) => void;
    timeWindowStart: (val: string) => void;
    timeWindowEnd: (val: string) => void;
    runOnDays: (val: number[]) => void;
  };
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  formError: string | null;
  isPending: boolean;
  workflows: Workflow[];
}

export function TaskAddEditSheet({
  mode,
  isOpen,
  onClose,
  values,
  onChange,
  onSubmit,
  formError,
  isPending,
  workflows,
}: TaskAddEditSheetProps) {
  const isAdd = mode === "add";
  const v = values;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={isAdd ? "Create New Task" : "Edit Task"}
      description={
        isAdd
          ? "Schedule a new action or recurring workflow."
          : "Update the task configuration."
      }
      footer={<></>}
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <input type="hidden" name="workflowId" value={v.workflowId} />
        <div className="space-y-6">
          <Input
            name="title"
            label="Task Title"
            placeholder="e.g. Weekly Sync"
            value={v.title}
            onChange={(e) => onChange.title(e.target.value)}
            required
          />
          <Dropdown
            label="Workflow (Required)"
            value={v.workflowId}
            onChange={onChange.workflowId}
            options={[
              { label: "Select a workflow...", value: "" },
              ...workflows.map((w) => ({ label: w.title, value: w.id })),
            ]}
          />
          <Textarea
            name="description"
            label="Description"
            placeholder="What should this task do?"
            value={v.description}
            onChange={(e) => onChange.description(e.target.value)}
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
                  checked={v.taskType === "one-time"}
                  onChange={() => onChange.taskType("one-time")}
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
                  checked={v.taskType === "recurring"}
                  onChange={() => onChange.taskType("recurring")}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--foreground)]">
                  Recurring
                </span>
              </label>
            </div>
          </div>

          {/* One-time Scheduling */}
          {v.taskType === "one-time" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="Date"
                value={v.scheduledDate}
                onChange={(e) => onChange.scheduledDate(e.target.value)}
                required={v.taskType === "one-time"}
              />
              <Input
                type="time"
                label="Time"
                value={v.scheduledTime}
                onChange={(e) => onChange.scheduledTime(e.target.value)}
                required={v.taskType === "one-time"}
              />
            </div>
          )}

          {/* Recurring Scheduling */}
          {v.taskType === "recurring" && (
            <div className="space-y-4">
              <Dropdown
                label="Repeat"
                value={v.intervalType}
                onChange={onChange.intervalType}
                options={INTERVAL_OPTIONS}
              />

              {/* Every N minutes/hours */}
              {v.intervalType === "minutes" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--muted)]">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="59"
                    value={v.intervalValue}
                    onChange={(e) =>
                      onChange.intervalValue(parseInt(e.target.value) || 1)
                    }
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                  />
                  <span className="text-sm text-[var(--muted)]">minute(s)</span>
                </div>
              )}

              {v.intervalType === "hours" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--muted)]">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="23"
                    value={v.intervalValue}
                    onChange={(e) =>
                      onChange.intervalValue(parseInt(e.target.value) || 1)
                    }
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                  />
                  <span className="text-sm text-[var(--muted)]">hour(s)</span>
                </div>
              )}

              {/* Time window toggle (for minutes/hours) */}
              {(v.intervalType === "minutes" || v.intervalType === "hours") && (
                <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--sidebar-bg)]/40 p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.timeWindowEnabled}
                      onChange={(e) =>
                        onChange.timeWindowEnabled(e.target.checked)
                      }
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      Restrict to time window
                    </span>
                  </label>
                  {v.timeWindowEnabled && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <Input
                        type="time"
                        label="From"
                        value={v.timeWindowStart}
                        onChange={(e) =>
                          onChange.timeWindowStart(e.target.value)
                        }
                      />
                      <Input
                        type="time"
                        label="To"
                        value={v.timeWindowEnd}
                        onChange={(e) => onChange.timeWindowEnd(e.target.value)}
                      />
                    </div>
                  )}
                  {v.timeWindowEnabled && (
                    <p className="pl-6 text-xs text-[var(--muted)]">
                      Task will only run between{" "}
                      <strong>{v.timeWindowStart}</strong> and{" "}
                      <strong>{v.timeWindowEnd}</strong>, respecting your
                      workspace timezone.
                    </p>
                  )}
                </div>
              )}

              {/* Day-of-week toggles */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Only run on
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const selected = v.runOnDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? v.runOnDays.filter((d) => d !== day.value)
                            : [...v.runOnDays, day.value].sort();
                          onChange.runOnDays(next);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                          selected
                            ? "bg-emerald-500/15 text-emerald-500 shadow-sm"
                            : "bg-[var(--sidebar-bg)] text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {day.label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {v.runOnDays.length === 0 && (
                  <p className="text-xs text-[var(--muted)]">
                    No selection = runs every day
                  </p>
                )}
              </div>

              {/* Daily - just time */}
              {v.intervalType === "daily" && (
                <Input
                  type="time"
                  label="Time of day"
                  value={v.timeOfDay}
                  onChange={(e) => onChange.timeOfDay(e.target.value)}
                />
              )}

              {/* Weekly - day of week + time */}
              {v.intervalType === "weekly" && (
                <div className="space-y-4">
                  <Dropdown
                    label="Day of week"
                    value={v.dayOfWeek.toString()}
                    onChange={(val) => onChange.dayOfWeek(parseInt(val))}
                    options={WEEKDAYS.map((d) => ({
                      label: d.label,
                      value: d.value.toString(),
                    }))}
                  />
                  <Input
                    type="time"
                    label="Time of day"
                    value={v.timeOfDay}
                    onChange={(e) => onChange.timeOfDay(e.target.value)}
                  />
                </div>
              )}

              {/* Monthly - day of month + time */}
              {v.intervalType === "monthly" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--muted)]">On day</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={v.dayOfMonth}
                      onChange={(e) =>
                        onChange.dayOfMonth(parseInt(e.target.value) || 1)
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
                    value={v.timeOfDay}
                    onChange={(e) => onChange.timeOfDay(e.target.value)}
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
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !v.title || !v.workflowId}
          >
            {isPending
              ? isAdd
                ? "Creating..."
                : "Saving..."
              : isAdd
                ? "Create Task"
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
