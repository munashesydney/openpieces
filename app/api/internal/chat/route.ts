import { NextRequest, NextResponse } from "next/server";
import {
  appendUserMessageAndMarkPending,
  createAiChat,
  getAiChatRecordById,
  getAiChatById,
} from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";
import { getServicesByWorkflowId } from "@/lib/services/service.service";
import { getWorkflowById } from "@/lib/services/workflow.service";
import { getActionServicesForWorkflow } from "@/lib/services/workflow-action.service";
import { getEndpointsByServiceId } from "@/lib/services/service-endpoint.service";

type InternalChatRequestBody = {
  workspaceId: string;
  userId: string;
  workflowId: string;
  serviceId: string;
  chatId?: string | null;
  content: string;
};

const INTERNAL_HEADER_NAME = "x-internal-secret";

function isAuthorized(request: NextRequest): boolean {
  const headerValue = request.headers.get(INTERNAL_HEADER_NAME) ?? "";
  const expected = process.env.INTERNAL_API_KEY ?? "";
  return Boolean(expected) && headerValue === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: InternalChatRequestBody;
  try {
    body = (await request.json()) as InternalChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const workspaceId = body.workspaceId?.trim();
  const userId = body.userId?.trim();
  const workflowId = body.workflowId?.trim();
  const serviceId = body.serviceId?.trim();
  let content = body.content?.trim();

  if (!workspaceId || !userId || !workflowId || !serviceId) {
    return NextResponse.json(
      { error: "workspaceId, userId, workflowId, and serviceId are required" },
      { status: 400 }
    );
  }

  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  try {
    const workflow = await getWorkflowById(workflowId, workspaceId);
    const triggerServices = await getServicesByWorkflowId(workflowId, workspaceId);
    const actionServices = await getActionServicesForWorkflow(workflowId, workspaceId);
    
    const uniqueServicesMap = new Map();
    for (const s of [...triggerServices, ...actionServices]) {
      uniqueServicesMap.set(s.id, s);
    }
    const allServices = Array.from(uniqueServicesMap.values());
    
    let servicesContext = "\n\n--- AUTO APPENDED WORKFLOW SERVICE CONTEXT ---\n";
    
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
      const endpoints = await getEndpointsByServiceId(service.id, workspaceId);
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
    
    if (content) {
      content += servicesContext;
    }

    let effectiveChatId = body.chatId ?? null;

    if (effectiveChatId) {
      const existingChat = await getAiChatRecordById(effectiveChatId, userId);
      if (!existingChat) {
        effectiveChatId = null;
      }
    }

    if (!effectiveChatId) {
      const chat = await createAiChat({
        workspaceId,
        userId,
      }, "events");
      effectiveChatId = chat.id;
    }

    await appendUserMessageAndMarkPending({
      chatId: effectiveChatId,
      content,
    });

    await enqueueChatExecution({
      chatId: effectiveChatId,
      workspaceId,
      userId,
    });

    const chat = await getAiChatById(effectiveChatId, userId);
    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found after enqueue" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        chatId: chat.id,
        workspaceId: chat.workspaceId,
        userId: chat.userId,
        status: "queued",
        chat,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("POST /api/internal/chat error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

