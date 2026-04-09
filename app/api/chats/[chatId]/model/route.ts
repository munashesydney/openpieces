import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { aiChats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

  return NextResponse.json({ model: chat.model });
}

export async function PATCH(
  request: Request,
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

  const body = await request.json();
  const { model } = body;

  if (!model || typeof model !== "string") {
    return NextResponse.json({ error: "Invalid model." }, { status: 400 });
  }

  await db
    .update(aiChats)
    .set({ model, updatedAt: new Date() })
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)));

  return NextResponse.json({ success: true, model });
}
