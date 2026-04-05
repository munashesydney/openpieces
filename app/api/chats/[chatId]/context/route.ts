import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { getAiChatRecordById, getAiMessages } from "@/lib/services/chat.service";
import { getContextInfo } from "@/lib/ai-chat/context-manager";
import { OPENPIECES_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/orchestratorV3";
import { EVENTS_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/events";
import { ARCHITECTURE_CHAT_SYSTEM_PROMPT } from "@/lib/ai-chat/prompts/architectureV2";

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
  const chat = await getAiChatRecordById(chatId, userId);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  const messages = await getAiMessages(chatId);
  const systemPrompt =
    chat.agentType === "events"
      ? EVENTS_CHAT_SYSTEM_PROMPT
      : chat.agentType === "architecture"
        ? ARCHITECTURE_CHAT_SYSTEM_PROMPT
        : OPENPIECES_CHAT_SYSTEM_PROMPT;

  const contextInfo = await getContextInfo(
    chat.model ?? "deepseek/deepseek-v3.2",
    messages,
    systemPrompt
  );

  return NextResponse.json(contextInfo);
}
