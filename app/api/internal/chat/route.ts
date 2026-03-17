import { NextRequest, NextResponse } from "next/server";
import {
  appendUserMessageAndMarkPending,
  createAiChat,
  getAiChatRecordById,
  getAiChatById,
} from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";

type InternalChatRequestBody = {
  workspaceId: string;
  userId: string;
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
  const content = body.content?.trim();

  if (!workspaceId || !userId) {
    return NextResponse.json(
      { error: "workspaceId and userId are required" },
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
    let effectiveChatId = body.chatId ?? null;

    if (effectiveChatId) {
      const existingChat = await getAiChatRecordById(effectiveChatId, userId);
      if (!existingChat) {
        return NextResponse.json(
          { error: "Chat not found" },
          { status: 404 }
        );
      }
    } else {
      const chat = await createAiChat({
        workspaceId,
        userId,
      });
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

