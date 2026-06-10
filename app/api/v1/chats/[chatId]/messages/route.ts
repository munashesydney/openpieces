import { NextResponse } from "next/server";
import { authenticateV1Request } from "../../../_auth";
import {
  getAiMessages,
  getAiChatById,
  appendUserMessageAndMarkPending,
} from "@/lib/services/chat.service";
import { enqueueChatExecution } from "@/lib/queues/pg-boss";

export const runtime = "nodejs";

/** GET /api/v1/chats/:chatId/messages — list messages */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const authResult = await authenticateV1Request(request);
  if (authResult instanceof NextResponse) return authResult;

  const { chatId } = await params;

  const chat = await getAiChatById(chatId, authResult.userId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await getAiMessages(chatId);
  return NextResponse.json({ messages });
}

/** POST /api/v1/chats/:chatId/messages — send a message and spawn orchestrator */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const authResult = await authenticateV1Request(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: { content?: string; mode?: "agent" | "chat" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const trimmedContent = (body.content ?? "").trim();
  if (!trimmedContent) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { chatId } = await params;

  try {
    const chat = await getAiChatById(chatId, authResult.userId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await appendUserMessageAndMarkPending({
      chatId,
      content: trimmedContent,
    });

    await enqueueChatExecution({
      chatId,
      workspaceId: chat.workspaceId,
      userId: authResult.userId,
      mode: body.mode,
    });

    const updated = await getAiChatById(chatId, authResult.userId);
    return NextResponse.json({ chat: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
