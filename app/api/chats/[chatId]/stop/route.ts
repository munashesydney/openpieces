import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAiChatRecordById, setChatStopped, updateAiChatStatus } from "@/lib/services/chat.service";
import { getChatPgBossJobId } from "@/lib/workers/chat-controller";
import { cancelChatExecution } from "@/lib/queues/pg-boss";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;

  const chat = await getAiChatRecordById(chatId, userId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // Cancel queued job so it doesn't start a new stream
  const jobId = getChatPgBossJobId(chatId);
  if (jobId) {
    await cancelChatExecution(jobId).catch(() => {});
  }

  // Set stopped flag — the worker polls this and calls abort()
  if (chat.status === "pending" || chat.status === "processing") {
    await setChatStopped(chatId, true);
    await updateAiChatStatus(chatId, "stopped");
  }

  return NextResponse.json({ ok: true });
}
