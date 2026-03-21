import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessageWithContext } from "@/lib/services/opencode.service";
import { requireUser } from "@/lib/services/auth.service";
import { db } from "@/lib/db";
import { opencodeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    // Get user from session - this is the UI path where there's a valid request context
    const user = await requireUser();
    await sendMessageWithContext(sessionId, content, user.id);
    await db
      .update(opencodeSessions)
      .set({ status: "working", updatedAt: new Date() })
      .where(eq(opencodeSessions.sessionId, sessionId))
      .catch(() => {});

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error: any) {
    console.error(`POST /api/opencode/sessions/${await params.then(p => p.sessionId)}/messages error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
