import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessage } from "@/lib/services/opencode.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const rawMessages = await getMessages(sessionId);
    
    // Normalize to { role, content } format expected by UI
    const messages = (Array.isArray(rawMessages) ? rawMessages : []).map(msg => ({
      role: msg.info?.role || "user",
      content: (msg.parts || [])
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n")
    }));

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error(`GET /api/opencode/sessions/${await params.then(p => p.sessionId)}/messages error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to get messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const rawMessage = await sendMessage(sessionId, content);
    
    // Normalize response from sendMessage
    const message = {
      role: rawMessage.info?.role || "assistant",
      content: (rawMessage.parts || [])
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n")
    };

    return NextResponse.json(message);
  } catch (error: any) {
    console.error(`POST /api/opencode/sessions/${await params.then(p => p.sessionId)}/messages error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
