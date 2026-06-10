import { NextResponse } from "next/server";
import { authenticateV1Request } from "../../_auth";
import { getAiChatById } from "@/lib/services/chat.service";

export const runtime = "nodejs";

/** GET /api/v1/chats/:chatId — get a single chat */
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

  return NextResponse.json({ chat });
}
