"use client";

import { useState } from "react";
import { Calendar, Clock, MoreHorizontal, Plus, Repeat, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { Dropdown } from "@/components/basic/input/dropdown";
import { Textarea } from "@/components/basic/input/textarea";

interface Task {
  id: string;
  title: string;
  description: string;
  type: "one-time" | "recurring";
  status: "active" | "paused" | "completed";
  scheduledFor?: string;
  frequency?: string;
}

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    title: "Quarterly Audit",
    description: "Generate and send the compliance report to the security team.",
    type: "recurring",
    status: "active",
    frequency: "Every 3 months",
  },
  {
    id: "2",
    title: "Database Migration",
    description: "Migrate legacy user data to the new distributed cluster.",
    type: "one-time",
    status: "active",
    scheduledFor: "Oct 24, 2026 • 10:00 PM",
  },
  {
    id: "3",
    title: "Daily Backup",
    description: "Full snapshot of all production databases and assets.",
    type: "recurring",
    status: "active",
    frequency: "Daily at 2:00 AM",
  },
  {
    id: "4",
    title: "System Maintenance",
    description: "Scheduled downtime for infrastructure upgrades.",
    type: "one-time",
    status: "completed",
    scheduledFor: "Aug 12, 2025",
  },
];

export function TasksList() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [frequency, setFrequency] = useState("one-time");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const recurringTasks = MOCK_TASKS.filter((t) => t.type === "recurring");
  const upcomingTasks = MOCK_TASKS.filter((t) => t.type === "one-time" && t.status !== "completed");
  const completedTasks = MOCK_TASKS.filter((t) => t.status === "completed");

  return (
    <div className="flex w-full justify-center px-6 pb-20 pt-10">
      <div className="w-full max-w-[820px] space-y-10">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Tasks</h1>
            <p className="text-sm text-[var(--muted)]">Manage your one-time and recurring scheduled actions.</p>
          </div>
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* New Task Sheet */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Create New Task"
          description="Schedule a new action or recurring workflow."
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsSheetOpen(false)}>Create Task</Button>
            </div>
          }
        >
          <div className="space-y-6">
            <Input
              label="Task Title"
              placeholder="e.g. Weekly Sync"
            />
            <Dropdown
              label="Associated Workflow (Required)"
              value={selectedWorkflow}
              onChange={setSelectedWorkflow}
              options={[
                { label: "Select a workflow...", value: "" },
                { label: "Post-Purchase Automation", value: "1" },
                { label: "Lead Nurturing Sequence", value: "2" },
                { label: "Technical Support Router", value: "3" },
              ]}
            />
            <Textarea
              label="Description"
              placeholder="What should this task do?"
            />
            <Dropdown
              label="Frequency"
              value={frequency}
              onChange={setFrequency}
              options={[
                { label: "One-time", value: "one-time" },
                { label: "Daily", value: "daily" },
                { label: "Weekly", value: "weekly" },
                { label: "Monthly", value: "monthly" },
              ]}
            />
          </div>
        </Sheet>

        {/* Recurring Tasks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Repeat className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Recurring</h2>
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
                      <h3 className="text-base font-medium text-[var(--foreground)]">{task.title}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{task.description}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--accent)]">
                          <Timer className="h-3 w-3" />
                          {task.frequency}
                        </div>
                        <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span className="text-[10px] font-bold uppercase text-emerald-500">Active</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Upcoming One-time Tasks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Upcoming</h2>
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
                      <h3 className="text-base font-medium text-[var(--foreground)]">{task.title}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{task.description}</p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] font-bold uppercase text-[var(--muted)]">
                         <span>One-time</span>
                         <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                         <span>{task.scheduledFor}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Completed Tasks (Simplified) */}
        {completedTasks.length > 0 && (
          <section className="space-y-4 pt-4">
            <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Recently Completed</h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-[var(--foreground)]">{task.title}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">{task.scheduledFor}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
