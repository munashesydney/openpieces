import { NextRequest, NextResponse } from "next/server";
import { broadcastSessionEvent } from "@/lib/opencode/event-stream";

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
