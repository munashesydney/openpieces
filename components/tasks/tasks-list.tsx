"use client";

import { useState, useTransition } from "react";
import { Calendar, Clock, MoreHorizontal, Plus, Repeat, Timer, Play, Pause, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "@/components/basic/buttons/button";
import { Sheet } from "../ui/sheet";
import { Input } from "@/components/basic/input/input";
import { Dropdown } from "@/components/basic/input/dropdown";
import { ActionMenu } from "@/components/basic/input/action-menu";
import { Textarea } from "@/components/basic/input/textarea";
import { createTaskAction, pauseTaskAction, resumeTaskAction, completeTaskAction, deleteTaskAction } from "@/app/workspace/[workspaceId]/personal/tasks/actions";
import { type Task } from "@/lib/db/schema";

export function TasksList({ 
  initialTasks, 
  workspaceId 
}: { 
  initialTasks: Task[];
  workspaceId: string;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [frequency, setFrequency] = useState("one-time");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const recurringTasks = initialTasks.filter((t) => t.type === "recurring");
  const upcomingTasks = initialTasks.filter((t) => t.type === "one-time" && t.status !== "completed");
  const completedTasks = initialTasks.filter((t) => t.status === "completed");

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !selectedWorkflow) return;
    
    const formData = new FormData(e.currentTarget);
    formData.append("type", frequency === "one-time" ? "one-time" : "recurring");
    if (frequency !== "one-time") {
      formData.append("frequency", frequency);
    }
    // Hardcode status to active
    formData.append("status", "active");

    startTransition(async () => {
      try {
        await createTaskAction(workspaceId, formData);
        setIsSheetOpen(false);
        setTitle("");
        setDescription("");
        setFrequency("one-time");
        setSelectedWorkflow("");
      } catch (err) {
        console.error("Failed to create task", err);
      }
    });
  };

  const StatusAction = ({ task }: { task: Task }) => {
    return (
      <ActionMenu
        onSelect={(val) => {
          startTransition(async () => {
            if (val === "pause") await pauseTaskAction(workspaceId, task.id);
            if (val === "resume") await resumeTaskAction(workspaceId, task.id);
            if (val === "complete") await completeTaskAction(workspaceId, task.id);
            if (val === "delete") await deleteTaskAction(workspaceId, task.id);
          });
        }}
        options={[
          ...(task.status === "active" ? [{ label: "Pause", value: "pause", icon: <Pause className="h-4 w-4" /> }] : []),
          ...(task.status === "paused" ? [{ label: "Resume", value: "resume", icon: <Play className="h-4 w-4" /> }] : []),
          ...(task.status !== "completed" ? [{ label: "Mark Completed", value: "complete", icon: <CheckCircle2 className="h-4 w-4" /> }] : []),
          { label: "Delete", value: "delete", icon: <Trash2 className="h-4 w-4" />, destructive: true },
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
                label="Associated Workflow (Required)"
                value={selectedWorkflow}
                onChange={setSelectedWorkflow}
                options={[
                  { label: "Select a workflow...", value: "" },
                  { label: "Post-Purchase Automation", value: "workflow_123" },
                  { label: "Lead Nurturing Sequence", value: "workflow_456" },
                  { label: "Technical Support Router", value: "workflow_789" },
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
            <div className="mt-8 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsSheetOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending || !title || !selectedWorkflow}>
                {isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
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
                          {task.frequency || "Recurring"}
                        </div>
                        <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                        <span className={`text-[10px] font-bold uppercase ${task.status === "active" ? "text-emerald-500" : "text-amber-500"}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusAction task={task} />
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
                         {task.scheduledFor && (
                           <>
                             <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                             <span>{task.scheduledFor}</span>
                           </>
                         )}
                         <div className="h-1 w-1 rounded-full bg-[var(--border)]" />
                         <span className={task.status === "active" ? "text-emerald-500 text-[10px] font-bold uppercase" : "text-amber-500 text-[10px] font-bold uppercase"}>
                           {task.status}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusAction task={task} />
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
            <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Recently Completed</h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-[var(--foreground)]">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.scheduledFor && <span className="text-[10px] font-bold uppercase text-[var(--muted)]">{task.scheduledFor}</span>}
                    <div className="shrink-0">
                      <StatusAction task={task} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
