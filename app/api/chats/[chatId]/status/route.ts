import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { getAiChatById } from "@/lib/services/chat.service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getAiChatById(chatId, userId);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({
    chatId: chat.id,
    status: chat.status,
    error: chat.error,
    updatedAt: chat.updatedAt,
  });
}
