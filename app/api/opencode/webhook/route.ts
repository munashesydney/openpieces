import { NextRequest, NextResponse } from "next/server";
import { broadcastSessionEvent } from "@/lib/opencode/event-stream";
import { db } from "@/lib/db";
import { opencodeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId ?? body.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const eventType = body.type ?? body.event?.type ?? null;
    const messageContent =
      body.content ??
      body.message?.content ??
      body.message?.text ??
      null;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (messageContent !== null) {
      updates.lastMessage = messageContent;
      updates.lastMessageAt = new Date();
    }

    if (eventType) {
      if (
        eventType === "session.idle" ||
        eventType === "session.done"
      ) {
        updates.status = "completed";
      } else if (eventType === "session.error" || eventType === "error") {
        updates.status = "failed";
      }
    }

    await db
      .update(opencodeSessions)
      .set(updates)
      .where(eq(opencodeSessions.sessionId, sessionId))
      .catch(() => {
        // Session may not exist yet — non-fatal
      });

    broadcastSessionEvent(sessionId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/opencode/webhook error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
