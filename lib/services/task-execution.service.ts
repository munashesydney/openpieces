import { and, lte, or, isNotNull, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, type Task } from "@/lib/db/schema";
import {
  createAiChat,
  appendUserMessageAndMarkPending,
} from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";
import { getWorkspaceOwnerId } from "@/lib/services/workspace.service";
import { getServicesByWorkflowId } from "@/lib/services/service.service";
import { getWorkflowById } from "@/lib/services/workflow.service";
import { getActionServicesForWorkflow } from "@/lib/services/workflow-action.service";
import { getEndpointsByServiceId } from "@/lib/services/service-endpoint.service";
import { createWorkflowExecution } from "@/lib/services/workflow-execution.service";

/**
 * Get all tasks that are due for execution.
 * One-time tasks: scheduledAt <= now()
 * Recurring tasks: nextRunAt <= now()
 */
export async function getDueTasks(): Promise<Task[]> {
  const now = new Date();

  const dueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "active"),
        or(
          // One-time tasks that are due
          and(
            eq(tasks.type, "one-time"),
            isNotNull(tasks.scheduledAt),
            lte(tasks.scheduledAt, now),
          ),
          // Recurring tasks that are due
          and(
            eq(tasks.type, "recurring"),
            isNotNull(tasks.nextRunAt),
            lte(tasks.nextRunAt, now),
          ),
        ),
      ),
    );

  for (const t of dueTasks) {
    console.log(
      `  task id=${t.id} type=${t.type} status=${t.status} scheduledAt=${t.scheduledAt?.toISOString() ?? "null"} nextRunAt=${t.nextRunAt?.toISOString() ?? "null"}`,
    );
  }

  // Only query workspace-specific recurring if we found due tasks
  if (dueTasks.length > 0) {
    const workspaceId = dueTasks[0]?.workspaceId;
    if (workspaceId) {
      const allRecurring = await db
        .select({
          id: tasks.id,
          status: tasks.status,
          nextRunAt: tasks.nextRunAt,
          intervalType: tasks.intervalType,
          timeOfDay: tasks.timeOfDay,
        })
        .from(tasks)
        .where(
          and(eq(tasks.type, "recurring"), eq(tasks.workspaceId, workspaceId)),
        );
      if (allRecurring.length > 0) {
        console.log(
          `[task-execution] All recurring tasks in workspace ${workspaceId}:`,
        );
        for (const r of allRecurring) {
          console.log(
            `  task id=${r.id} status=${r.status} intervalType=${r.intervalType} timeOfDay=${r.timeOfDay} nextRunAt=${r.nextRunAt?.toISOString() ?? "null"}`,
          );
        }
      }
    }
  }

  return dueTasks;
}

/**
 * Given a wall clock time in a specific timezone, convert it to the
 * equivalent UTC Date.
 *
 * e.g., wall clock "2026-04-27 17:15" in America/Vancouver
 *       returns the Date for 2026-04-28 00:15 UTC (during PDT, UTC-7).
 */
function wallClockToUtc(
  timezone: string,
  year: number,
  month: number, // 1-indexed
  day: number,
  hours: number,
  minutes: number,
): Date {
  // Guess UTC by pretending the wall clock IS UTC
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  // Format that guess in the target timezone to see what wall clock it shows
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(guessUtc);

  // Rebuild "YYYY-MM-DDTHH:MM:SS" string and parse as UTC
  let wallStr = "";
  for (const p of parts) {
    if (p.type === "year") wallStr += p.value;
    else if (p.type === "month") wallStr += "-" + p.value;
    else if (p.type === "day") wallStr += "-" + p.value;
    else if (p.type === "hour") wallStr += "T" + p.value;
    else if (p.type === "minute") wallStr += ":" + p.value;
    else if (p.type === "second") wallStr += ":" + p.value;
  }
  const wallAsUtc = new Date(wallStr + "Z");

  // offset = wallAsUtc - guessUtc (in ms)
  const offsetMs = wallAsUtc.getTime() - guessUtc.getTime();

  // Actual UTC = target wall clock - offset
  const targetWallUtc = new Date(
    Date.UTC(year, month - 1, day, hours, minutes),
  );
  return new Date(targetWallUtc.getTime() - offsetMs);
}

/**
 * Get the current wall-clock date components in a given timezone.
 */
function getDateInTimezone(
  timezone: string,
  date: Date,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string) => {
    const p = parts.find((p) => p.type === type);
    return p ? parseInt(p.value, 10) : 1;
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

/**
 * Add N days to a wall-clock date in the given timezone, returning the
 * resulting wall-clock date components in that same timezone.
 */
function addDaysInTimezone(
  timezone: string,
  tzYear: number,
  tzMonth: number, // 1-indexed
  tzDay: number,
  days: number,
): { year: number; month: number; day: number } {
  const utcDate = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay + days, 12));
  return getDateInTimezone(timezone, utcDate);
}

/**
 * Compute the next UTC datetime for a calendar-based interval (daily, weekly,
 * monthly) respecting the user's timezone.
 */
function calculateCalendarRunInTimezone(
  now: Date,
  timezone: string,
  intervalType: "daily" | "weekly" | "monthly",
  hours: number,
  minutes: number,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
): Date {
  const {
    year: tzYear,
    month: tzMonth,
    day: tzDay,
  } = getDateInTimezone(timezone, now);

  switch (intervalType) {
    case "daily": {
      // Try today
      let targetUtc = wallClockToUtc(
        timezone,
        tzYear,
        tzMonth,
        tzDay,
        hours,
        minutes,
      );
      if (targetUtc <= now) {
        // Move to tomorrow in target timezone
        const next = addDaysInTimezone(timezone, tzYear, tzMonth, tzDay, 1);
        targetUtc = wallClockToUtc(
          timezone,
          next.year,
          next.month,
          next.day,
          hours,
          minutes,
        );
      }
      return targetUtc;
    }

    case "weekly": {
      // Get current day of week in target timezone (0=Sunday)
      const dateInTz = getDateInTimezone(timezone, now);
      const dowDate = new Date(
        Date.UTC(dateInTz.year, dateInTz.month - 1, dateInTz.day),
      );
      const currentDOW = dowDate.getUTCDay(); // 0=Sun..6=Sat

      const targetDOW = dayOfWeek ?? 0;
      let daysUntil = targetDOW - currentDOW;
      if (daysUntil < 0) daysUntil += 7;

      // If it's the same day and the time hasn't passed yet, use today
      if (daysUntil === 0) {
        const todayUtc = wallClockToUtc(
          timezone,
          tzYear,
          tzMonth,
          tzDay,
          hours,
          minutes,
        );
        if (todayUtc > now) return todayUtc;
        daysUntil = 7; // same day, time already passed → next week
      }

      const next = addDaysInTimezone(
        timezone,
        tzYear,
        tzMonth,
        tzDay,
        daysUntil,
      );
      return wallClockToUtc(
        timezone,
        next.year,
        next.month,
        next.day,
        hours,
        minutes,
      );
    }

    case "monthly": {
      const targetDOM = dayOfMonth ?? 1;
      let daysUntilTarget = targetDOM - tzDay;
      if (daysUntilTarget < 0) {
        // Move to next month
        daysUntilTarget += new Date(Date.UTC(tzYear, tzMonth, 0)).getUTCDate(); // days in current month
      }

      if (daysUntilTarget === 0) {
        const todayUtc = wallClockToUtc(
          timezone,
          tzYear,
          tzMonth,
          tzDay,
          hours,
          minutes,
        );
        if (todayUtc > now) return todayUtc;
        // Same day, time already passed → add days in current month
        daysUntilTarget += new Date(Date.UTC(tzYear, tzMonth, 0)).getUTCDate();
      }

      const next = addDaysInTimezone(
        timezone,
        tzYear,
        tzMonth,
        tzDay,
        daysUntilTarget,
      );
      return wallClockToUtc(
        timezone,
        next.year,
        next.month,
        next.day,
        hours,
        minutes,
      );
    }

    default:
      return new Date(now.getTime() + 60 * 60 * 1000);
  }
}

/**
 * If the task has `runOnDays` restrictions, advance the candidate date to the
 * next allowed day of the week, preserving the time-of-day.
 */
function enforceRunOnDays(
  candidate: Date,
  runOnDays: number[] | null | undefined,
  timezone: string | null | undefined,
): Date {
  if (!runOnDays || runOnDays.length === 0) return candidate;

  const tz = timezone || "UTC";

  // Determine the day-of-week of the candidate in the target timezone
  let dayOfWeek: number;
  if (tz === "UTC") {
    dayOfWeek = candidate.getUTCDay();
  } else {
    const { year, month, day } = getDateInTimezone(tz, candidate);
    const dowDate = new Date(Date.UTC(year, month - 1, day));
    dayOfWeek = dowDate.getUTCDay();
  }

  if (runOnDays.includes(dayOfWeek)) return candidate;

  // Advance to the next allowed day
  for (let d = 1; d <= 7; d++) {
    const nextDay = (dayOfWeek + d) % 7;
    if (runOnDays.includes(nextDay)) {
      const result = new Date(candidate);
      result.setDate(result.getDate() + d);
      return result;
    }
  }

  return candidate; // fallback (shouldn't happen)
}

/**
 * Calculate the next run time for a recurring task based on its interval settings.
 *
 * - For minutes/hours intervals, timezone doesn't matter (relative durations).
 * - For daily/weekly/monthly intervals, the user's timezone is used to
 *   correctly map the wall-clock timeOfDay to a UTC instant.
 */
export function calculateNextRunTime(task: Task): Date {
  const now = new Date();
  const {
    intervalType,
    intervalValue,
    dayOfWeek,
    dayOfMonth,
    timeOfDay,
    timezone,
    runOnDays,
  } = task;

  // Default to 1 hour from now if no interval info
  if (!intervalType) {
    return enforceRunOnDays(
      new Date(now.getTime() + 60 * 60 * 1000),
      runOnDays,
      timezone,
    );
  }

  // Parse timeOfDay if present (format: "HH:MM")
  let hours = 0;
  let minutes = 0;
  if (timeOfDay) {
    const [h, m] = timeOfDay.split(":").map(Number);
    hours = h ?? 0;
    minutes = m ?? 0;
  }

  // Minutes/hours are relative durations
  if (intervalType === "minutes" || intervalType === "hours") {
    const intervalMs =
      intervalType === "minutes"
        ? Math.max(1, intervalValue ?? 1) * 60 * 1000
        : Math.max(1, intervalValue ?? 1) * 60 * 60 * 1000;

    const tz = timezone || "UTC";
    const timeWindowStart = task.timeWindowStart;
    const timeWindowEnd = task.timeWindowEnd;

    // No time window → simple interval from now
    if (!timeWindowStart || !timeWindowEnd) {
      return enforceRunOnDays(
        new Date(now.getTime() + intervalMs),
        runOnDays,
        timezone,
      );
    }

    // ── Time window is active ───────────────────────────────────────────────
    // Parse window boundaries
    const [startH, startM] = timeWindowStart.split(":").map(Number);
    const [endH, endM] = timeWindowEnd.split(":").map(Number);

    if (tz === "UTC") {
      // No timezone conversion needed — work directly in UTC
      const todayStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          startH,
          startM,
        ),
      );
      const todayEnd = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          endH,
          endM,
        ),
      );

      // Past the end → start of window tomorrow
      if (now >= todayEnd) {
        const tomorrow = new Date(todayStart);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        return enforceRunOnDays(tomorrow, runOnDays, timezone);
      }

      // Before the start → start of window today
      if (now < todayStart) {
        return enforceRunOnDays(todayStart, runOnDays, timezone);
      }

      // Within the window
      const next = new Date(now.getTime() + intervalMs);
      if (next >= todayEnd) {
        const tomorrow = new Date(todayStart);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        return enforceRunOnDays(tomorrow, runOnDays, timezone);
      }
      return enforceRunOnDays(next, runOnDays, timezone);
    }

    // ── Non-UTC timezone: use timezone-aware helpers ────────────────────────
    // Get current wall-clock components in the target timezone
    const tzParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);

    const getTzPart = (type: string): number => {
      const p = tzParts.find((p) => p.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };

    const tzYear = getTzPart("year");
    const tzMonth = getTzPart("month");
    const tzDay = getTzPart("day");

    // Calculate today's window boundaries in UTC
    const windowStartUtc = wallClockToUtc(
      tz,
      tzYear,
      tzMonth,
      tzDay,
      startH,
      startM,
    );
    const windowEndUtc = wallClockToUtc(tz, tzYear, tzMonth, tzDay, endH, endM);

    // Past the end → start of window tomorrow
    if (now >= windowEndUtc) {
      const tomorrow = addDaysInTimezone(tz, tzYear, tzMonth, tzDay, 1);
      return enforceRunOnDays(
        wallClockToUtc(
          tz,
          tomorrow.year,
          tomorrow.month,
          tomorrow.day,
          startH,
          startM,
        ),
        runOnDays,
        timezone,
      );
    }

    // Before the start → start of window today
    if (now < windowStartUtc) {
      return enforceRunOnDays(windowStartUtc, runOnDays, timezone);
    }

    // Within the window
    const next = new Date(now.getTime() + intervalMs);
    if (next >= windowEndUtc) {
      const tomorrow = addDaysInTimezone(tz, tzYear, tzMonth, tzDay, 1);
      return enforceRunOnDays(
        wallClockToUtc(
          tz,
          tomorrow.year,
          tomorrow.month,
          tomorrow.day,
          startH,
          startM,
        ),
        runOnDays,
        timezone,
      );
    }
    return enforceRunOnDays(next, runOnDays, timezone);
  }

  // Calendar-based intervals with a timezone — use timezone-aware logic
  if (timezone && timezone !== "UTC") {
    return enforceRunOnDays(
      calculateCalendarRunInTimezone(
        now,
        timezone,
        intervalType,
        hours,
        minutes,
        dayOfWeek,
        dayOfMonth,
      ),
      runOnDays,
      timezone,
    );
  }

  // Fallback: UTC-based calculation (original behaviour)
  const next = new Date(now);

  switch (intervalType) {
    case "daily":
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case "weekly":
      next.setHours(hours, minutes, 0, 0);
      const targetDay = dayOfWeek ?? 0; // 0 = Sunday
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0) daysUntilTarget += 7;
      if (daysUntilTarget === 0 && next <= now) daysUntilTarget = 7;
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    case "monthly":
      next.setHours(hours, minutes, 0, 0);
      const targetDayOfMonth = dayOfMonth ?? 1;
      const currentDayOfMonth = next.getDate();
      let d = targetDayOfMonth - currentDayOfMonth;
      if (d < 0) d += 30;
      if (d === 0 && next <= now) d = 30;
      next.setDate(next.getDate() + d);
      break;
    default:
      next.setTime(next.getTime() + 60 * 60 * 1000);
  }

  return enforceRunOnDays(next, runOnDays, timezone);
}

/**
 * Enqueue a task for execution by creating an AI chat and sending the task details.
 */
export async function enqueueTaskForExecution(task: Task): Promise<void> {
  // Get workspace owner ID for the AI chat
  const userId = await getWorkspaceOwnerId(task.workspaceId);
  if (!userId) {
    console.error(
      `[task-execution] Could not find owner for workspace ${task.workspaceId}`,
    );
    return;
  }

  // Create an AI chat for this task execution
  const chat = await createAiChat(
    {
      workspaceId: task.workspaceId,
      userId,
    },
    "events",
  );

  // Create a workflow execution record to track this run
  if (task.workflowId) {
    await createWorkflowExecution({
      workspaceId: task.workspaceId,
      workflowId: task.workflowId,
      chatId: chat.id,
      taskId: task.id,
      triggerType: "task",
      status: "pending",
    });
  }

  // Create a detailed message describing the task
  const taskDescription = task.description || "No description provided.";

  let servicesContext = "";

  // If task is linked to a workflow, pre-load all services/endpoints so AI doesn't need to call lookup functions
  if (task.workflowId) {
    const workflow = await getWorkflowById(task.workflowId, task.workspaceId);
    const triggerServices = await getServicesByWorkflowId(
      task.workflowId,
      task.workspaceId,
    );
    const actionServices = await getActionServicesForWorkflow(
      task.workflowId,
      task.workspaceId,
    );

    const uniqueServicesMap = new Map();
    for (const s of [...triggerServices, ...actionServices]) {
      uniqueServicesMap.set(s.id, s);
    }
    const allServices = Array.from(uniqueServicesMap.values());

    servicesContext += "\n\n--- AUTO APPENDED WORKFLOW SERVICE CONTEXT ---\n";

    if (workflow) {
      servicesContext += `Workflow Title: ${workflow.title}\n`;
      if (workflow.description) {
        servicesContext += `Workflow Description: ${workflow.description}\n`;
      }
      if (workflow.detailedSteps && workflow.detailedSteps.length > 0) {
        servicesContext += `Workflow Detailed Steps (Instructions):\n${workflow.detailedSteps.join("\n")}\n\n`;
      }
    }

    servicesContext +=
      "The following services and their endpoints are linked to this workflow. You can call these endpoints immediately without needing to look them up.\n\n";

    for (const service of allServices) {
      servicesContext += `Service: ${service.title} (ID: ${service.id}, Type: ${service.type})\n`;
      const endpoints = await getEndpointsByServiceId(
        service.id,
        task.workspaceId,
      );
      if (endpoints.length === 0) {
        servicesContext += `  (No endpoints registered)\n`;
      } else {
        for (const ep of endpoints) {
          servicesContext += `  - Endpoint [ID: ${ep.id}] | ${ep.method} ${ep.path} | ${ep.description}\n`;
          if (ep.inputSchema && Object.keys(ep.inputSchema).length > 0) {
            servicesContext += `      Input Schema: ${JSON.stringify(ep.inputSchema)}\n`;
          }
        }
      }
      servicesContext += "\n";
    }
  }

  let messageContent = `Please execute the following task:

**Task Title:** ${task.title}

**Task Description:** ${taskDescription}

**Workflow ID:** ${task.workflowId || "not specified"}

**Task Type:** ${task.type === "recurring" ? "Recurring" : "One-time"}

Please process this task by executing the associated workflow. If there are any issues or if this task requires additional input, please handle them appropriately.

${
  task.type === "recurring" && task.intervalType
    ? `This is a recurring task (${task.intervalType}${task.intervalValue ? ` every ${task.intervalValue}` : ""}).`
    : ""
}`;

  if (servicesContext) {
    messageContent += servicesContext;
  }

  // Append the task message to the chat
  await appendUserMessageAndMarkPending({
    chatId: chat.id,
    content: messageContent,
  });

  // Enqueue the chat for processing
  await enqueueChatExecution({
    chatId: chat.id,
    workspaceId: task.workspaceId,
    userId,
  });

  console.log(
    `[task-execution] Enqueued task ${task.id} for execution in chat ${chat.id}`,
  );
}

/**
 * Mark a task as having been executed.
 * For one-time tasks: mark as completed.
 * For recurring tasks: update lastRunAt and calculate nextRunAt.
 */
export async function markTaskAsExecuted(task: Task): Promise<void> {
  const now = new Date();

  if (task.type === "one-time") {
    // Mark one-time tasks as completed
    await db
      .update(tasks)
      .set({
        status: "completed",
        lastRunAt: now,
        updatedAt: now,
      })
      .where(eq(tasks.id, task.id));
  } else {
    // Calculate next run time for recurring tasks
    const nextRunAt = calculateNextRunTime(task);

    console.log(
      `[task-execution] Task ${task.id} (${task.timeOfDay} ${task.intervalType}) nextRunAt: ${task.nextRunAt?.toISOString() ?? "null"} → ${nextRunAt.toISOString()} (timezone=${task.timezone ?? "UTC"})`,
    );

    await db
      .update(tasks)
      .set({
        lastRunAt: now,
        nextRunAt,
        updatedAt: now,
      })
      .where(eq(tasks.id, task.id));
  }
}

/**
 * Process all due tasks.
 */
export async function processDueTasks(): Promise<void> {
  const dueTasks = await getDueTasks();

  if (dueTasks.length === 0) {
    return;
  }

  const oneTimeCount = dueTasks.filter((t) => t.type === "one-time").length;
  const recurringCount = dueTasks.filter((t) => t.type === "recurring").length;
  console.log(
    `[task-execution] processDueTasks: processing ${dueTasks.length} task(s) (${oneTimeCount} one-time, ${recurringCount} recurring)`,
  );

  for (const task of dueTasks) {
    try {
      console.log(
        `[task-execution] Processing task ${task.id} (type=${task.type})...`,
      );
      await enqueueTaskForExecution(task);
      await markTaskAsExecuted(task);
      console.log(`[task-execution] Successfully processed task ${task.id}`);
    } catch (error) {
      console.error(
        `[task-execution] Failed to process task ${task.id}:`,
        error,
      );
    }
  }

  console.log(`[task-execution] Processed ${dueTasks.length} due tasks`);
}
