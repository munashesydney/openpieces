import { NextRequest, NextResponse } from "next/server";
import {
  appendUserMessageAndMarkPending,
  createAiChat,
  getAiChatRecordById,
  getAiChatById,
} from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";
import {
  createWorkflowExecution,
  createWorkflowExecutionsForEvent,
} from "@/lib/services/workflow-execution.service";
import { getServicesByWorkflowId } from "@/lib/services/service.service";
import { getWorkflowById } from "@/lib/services/workflow.service";
import { getActionServicesForWorkflow } from "@/lib/services/workflow-action.service";
import { getEndpointsByServiceId } from "@/lib/services/service-endpoint.service";
import { getEventById, createOrGetEvent } from "@/lib/services/event.service";

type InternalChatRequestBody = {
  workspaceId: string;
  userId: string;
  workflowId?: string;
  serviceId: string;
  eventName?: string;
  eventId?: string;
  eventPayload?: Record<string, unknown> | null;
  chatId?: string | null;
  content: string;
};

type WorkflowExecutionResult = {
  workflowId: string;
  chatId: string;
  executionId: string;
  status: string;
};

const INTERNAL_HEADER_NAME = "x-internal-secret";

function isAuthorized(request: NextRequest): boolean {
  const headerValue = request.headers.get(INTERNAL_HEADER_NAME) ?? "";
  const expected = process.env.INTERNAL_API_KEY ?? "";
  return Boolean(expected) && headerValue === expected;
}

async function buildServicesContext(
  workflowId: string,
  workspaceId: string,
): Promise<string> {
  const workflow = await getWorkflowById(workflowId, workspaceId);
  const triggerServices = await getServicesByWorkflowId(
    workflowId,
    workspaceId,
  );
  const actionServices = await getActionServicesForWorkflow(
    workflowId,
    workspaceId,
  );

  const uniqueServicesMap = new Map();
  for (const s of [...triggerServices, ...actionServices]) {
    uniqueServicesMap.set(s.id, s);
  }
  const allServices = Array.from(uniqueServicesMap.values());

  let ctx = "\n\n--- AUTO APPENDED WORKFLOW SERVICE CONTEXT ---\n";

  if (workflow) {
    ctx += `Workflow Title: ${workflow.title}\n`;
    if (workflow.description) {
      ctx += `Workflow Description: ${workflow.description}\n`;
    }
    if (workflow.detailedSteps && workflow.detailedSteps.length > 0) {
      ctx += `Workflow Detailed Steps (Instructions):\n${workflow.detailedSteps.join("\n")}\n\n`;
    }
  }

  ctx +=
    "The following services and their endpoints are linked to this workflow. You can call these endpoints immediately without needing to look them up.\n\n";

  for (const service of allServices) {
    ctx += `Service: ${service.title} (ID: ${service.id}, Type: ${service.type})\n`;
    const endpoints = await getEndpointsByServiceId(service.id, workspaceId);
    if (endpoints.length === 0) {
      ctx += "  (No endpoints registered)\n";
    } else {
      for (const ep of endpoints) {
        ctx += `  - Endpoint [ID: ${ep.id}] | ${ep.method} ${ep.path} | ${ep.description}\n`;
        if (ep.inputSchema && Object.keys(ep.inputSchema).length > 0) {
          ctx += `      Input Schema: ${JSON.stringify(ep.inputSchema)}\n`;
        }
      }
    }
    ctx += "\n";
  }

  return ctx;
}

async function fireWorkflow(
  workflowId: string,
  workspaceId: string,
  userId: string,
  content: string,
  chatId: string | null,
  triggerType: "internal_chat" | "event",
  eventId?: string,
  eventPayload?: Record<string, unknown> | null,
): Promise<WorkflowExecutionResult> {
  // Build enriched context for this workflow
  const servicesContext = await buildServicesContext(workflowId, workspaceId);

  let enrichedContent = content;
  if (servicesContext) {
    enrichedContent += servicesContext;
  }

  let effectiveChatId = chatId ?? null;

  if (effectiveChatId) {
    const existingChat = await getAiChatRecordById(effectiveChatId, userId);
    if (!existingChat) {
      effectiveChatId = null;
    }
  }

  if (!effectiveChatId) {
    const chat = await createAiChat(
      {
        workspaceId,
        userId,
      },
      "events",
    );
    effectiveChatId = chat.id;
  }

  await appendUserMessageAndMarkPending({
    chatId: effectiveChatId,
    content: enrichedContent,
  });

  await enqueueChatExecution({
    chatId: effectiveChatId,
    workspaceId,
    userId,
  });

  const execution = await createWorkflowExecution({
    workspaceId,
    workflowId,
    chatId: effectiveChatId,
    eventId: eventId ?? null,
    eventPayload: eventPayload ?? null,
    triggerType,
    status: "pending",
  });

  return {
    workflowId,
    chatId: effectiveChatId,
    executionId: execution.id,
    status: "queued",
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: InternalChatRequestBody;
  try {
    body = (await request.json()) as InternalChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const workspaceId = body.workspaceId?.trim();
  const userId = body.userId?.trim();
  const workflowId = body.workflowId?.trim();
  const serviceId = body.serviceId?.trim();
  const eventId = body.eventId?.trim();
  const eventName = body.eventName?.trim();
  const eventPayload = body.eventPayload ?? null;
  const content = body.content?.trim();

  if (!workspaceId || !userId || !serviceId) {
    return NextResponse.json(
      {
        error: "workspaceId, userId, and serviceId are required",
      },
      { status: 400 },
    );
  }

  if (!workflowId && !eventId && !eventName) {
    return NextResponse.json(
      {
        error: "Either workflowId, eventId, or eventName is required",
      },
      { status: 400 },
    );
  }

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    // ── Direct workflow trigger (backward compatible) ──
    if (workflowId) {
      const result = await fireWorkflow(
        workflowId,
        workspaceId,
        userId,
        content,
        body.chatId ?? null,
        "internal_chat",
      );

      const chat = await getAiChatById(result.chatId, userId);
      if (!chat) {
        return NextResponse.json(
          { error: "Chat not found after enqueue" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          chatId: chat.id,
          workspaceId: chat.workspaceId,
          userId: chat.userId,
          status: "queued",
          chat,
          executionId: result.executionId,
        },
        { status: 202 },
      );
    }

    // ── Event-based fan-out ──
    if (eventId || eventName) {
      // Resolve event: by ID or auto-create by name
      let resolvedEvent: Awaited<ReturnType<typeof getEventById>> | null = null;
      let effectiveEventId = "";

      if (eventId) {
        resolvedEvent = await getEventById(eventId, workspaceId);
        if (!resolvedEvent) {
          return NextResponse.json(
            { error: `Event not found: ${eventId}` },
            { status: 404 },
          );
        }
        effectiveEventId = eventId;
      } else if (eventName) {
        resolvedEvent = await createOrGetEvent(workspaceId, eventName);
        effectiveEventId = resolvedEvent.id;
      }

      // Create workflow executions for all subscribed workflows
      const executionResults = await createWorkflowExecutionsForEvent(
        effectiveEventId,
        workspaceId,
        eventPayload,
      );

      if (executionResults.length === 0) {
        return NextResponse.json(
          {
            eventId: effectiveEventId,
            eventName: resolvedEvent!.eventName,
            message:
              "No workflows are subscribed to this event. No workflow executions created.",
            executions: [],
          },
          { status: 200 },
        );
      }

      // Create a chat for each subscribed workflow and fire them
      const chatPrefix = `[Event: ${resolvedEvent!.eventName}]\n[serviceId: ${serviceId}]\n\n`;
      const eventPrefixedContent = chatPrefix + content;

      const results: WorkflowExecutionResult[] = [];
      for (const { workflowId: wid } of executionResults) {
        const result = await fireWorkflow(
          wid,
          workspaceId,
          userId,
          eventPrefixedContent,
          null, // each workflow gets its own fresh chat
          "event",
          effectiveEventId,
          eventPayload,
        );
        results.push(result);
      }

      return NextResponse.json(
        {
          eventId: effectiveEventId,
          eventName: resolvedEvent!.eventName,
          status: "queued",
          executions: results,
        },
        { status: 202 },
      );
    }

    // Should not reach here due to validation above
    return NextResponse.json(
      { error: "Unexpected: neither workflowId nor eventId was resolved" },
      { status: 400 },
    );
  } catch (error: unknown) {
    console.error("POST /api/internal/chat error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
