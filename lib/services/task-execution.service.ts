import { and, lte, or, isNotNull, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, type Task } from "@/lib/db/schema";
import { createAiChat, appendUserMessageAndMarkPending } from "@/lib/services/chat.service";
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
            lte(tasks.scheduledAt, now)
          ),
          // Recurring tasks that are due
          and(
            eq(tasks.type, "recurring"),
            isNotNull(tasks.nextRunAt),
            lte(tasks.nextRunAt, now)
          )
        )
      )
    );

  return dueTasks;
}

/**
 * Calculate the next run time for a recurring task based on its interval settings.
 */
export function calculateNextRunTime(task: Task): Date {
  const now = new Date();
  const { intervalType, intervalValue, dayOfWeek, dayOfMonth, timeOfDay, timezone } = task;

  // Default to 1 hour from now if no interval info
  if (!intervalType) {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  // Parse timeOfDay if present (format: "HH:MM")
  let hours = 0;
  let minutes = 0;
  if (timeOfDay) {
    const [h, m] = timeOfDay.split(":").map(Number);
    hours = h ?? 0;
    minutes = m ?? 0;
  }

  // Create a date in the target timezone (simplified - using local time)
  const next = new Date(now);

  switch (intervalType) {
    case "minutes": {
      const interval = intervalValue ?? 1;
      next.setMinutes(next.getMinutes() + interval);
      break;
    }
    case "hours": {
      const interval = intervalValue ?? 1;
      next.setHours(next.getHours() + interval);
      break;
    }
    case "daily": {
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        // Move to next day
        next.setDate(next.getDate() + 1);
      }
      break;
    }
    case "weekly": {
      next.setHours(hours, minutes, 0, 0);
      const targetDay = dayOfWeek ?? 0; // 0 = Sunday
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0) daysUntilTarget += 7;
      if (daysUntilTarget === 0 && next <= now) daysUntilTarget = 7;
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    }
    case "monthly": {
      next.setHours(hours, minutes, 0, 0);
      const targetDayOfMonth = dayOfMonth ?? 1;
      const currentDayOfMonth = next.getDate();
      let daysUntilTarget = targetDayOfMonth - currentDayOfMonth;
      if (daysUntilTarget < 0) daysUntilTarget += 30;
      if (daysUntilTarget === 0 && next <= now) daysUntilTarget = 30;
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    }
    default:
      next.setTime(next.getTime() + 60 * 60 * 1000); // Default 1 hour
  }

  return next;
}

/**
 * Enqueue a task for execution by creating an AI chat and sending the task details.
 */
export async function enqueueTaskForExecution(task: Task): Promise<void> {
  // Get workspace owner ID for the AI chat
  const userId = await getWorkspaceOwnerId(task.workspaceId);
  if (!userId) {
    console.error(`[task-execution] Could not find owner for workspace ${task.workspaceId}`);
    return;
  }

  // Create an AI chat for this task execution
  const chat = await createAiChat({
    workspaceId: task.workspaceId,
    userId,
  }, "events");

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
    const triggerServices = await getServicesByWorkflowId(task.workflowId, task.workspaceId);
    const actionServices = await getActionServicesForWorkflow(task.workflowId, task.workspaceId);

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
      if (workflow.detailedSteps) {
        servicesContext += `Workflow Detailed Steps (Instructions):\n${workflow.detailedSteps}\n\n`;
      }
    }

    servicesContext += "The following services and their endpoints are linked to this workflow. You can call these endpoints immediately without needing to look them up.\n\n";

    for (const service of allServices) {
      servicesContext += `Service: ${service.title} (ID: ${service.id}, Type: ${service.type})\n`;
      const endpoints = await getEndpointsByServiceId(service.id, task.workspaceId);
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

${task.type === "recurring" && task.intervalType
    ? `This is a recurring task (${task.intervalType}${task.intervalValue ? ` every ${task.intervalValue}` : ""}).`
    : ""}`;

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

  console.log(`[task-execution] Enqueued task ${task.id} for execution in chat ${chat.id}`);
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

  for (const task of dueTasks) {
    try {
      await enqueueTaskForExecution(task);
      await markTaskAsExecuted(task);
    } catch (error) {
      console.error(`[task-execution] Failed to process task ${task.id}:`, error);
    }
  }

  if (dueTasks.length > 0) {
    console.log(`[task-execution] Processed ${dueTasks.length} due tasks`);
  }
}