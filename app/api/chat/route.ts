import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";
import {
  appendUserMessageAndMarkPending,
  getAiChatRecordById,
} from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const body = (await request.json()) as { chatId?: string; content?: string };
  const chatId = url.searchParams.get("chatId") ?? body.chatId;
  const content = body.content?.trim();

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required." }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  const chat = await getAiChatRecordById(chatId, userId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  await appendUserMessageAndMarkPending({
    chatId,
    content,
  });

  await enqueueChatExecution({
    chatId,
    workspaceId: chat.workspaceId,
    userId,
  });

  return NextResponse.json({
    success: true,
    chatId,
    status: "pending",
  });
}
