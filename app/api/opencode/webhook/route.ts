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

    if (
      eventType === "session.idle" ||
      eventType === "session.done" ||
      eventType === "session.error" ||
      eventType === "error"
    ) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (messageContent !== null) {
        updates.lastMessage = messageContent;
        updates.lastMessageAt = new Date();
      }

      if (
        eventType === "session.idle" ||
        eventType === "session.done"
      ) {
        updates.status = "completed";
      } else if (eventType === "session.error" || eventType === "error") {
        updates.status = "failed";
      }

      await db
        .update(opencodeSessions)
        .set(updates)
        .where(eq(opencodeSessions.sessionId, sessionId))
        .catch(() => {
          // Session may not exist yet — non-fatal
        });
    }

    broadcastSessionEvent(sessionId, body);

    // After session completes, try to spawn the linked service (fire-and-forget)
    if (eventType === "session.idle" || eventType === "session.done") {
      const { getSessionInfoById } = await import("@/lib/services/opencode-session.service");
      const { validateServiceForSpawn } = await import("@/lib/services/service.service");
      const { enqueueServiceSpawn } = await import("@/lib/queues/pg-boss");

      getSessionInfoById(sessionId).then(async (sessionInfo) => {
        if (!sessionInfo?.serviceId) return;
        const validation = await validateServiceForSpawn(sessionInfo.serviceId, sessionInfo.workspaceId);
        if (validation.valid) {
          await enqueueServiceSpawn({ serviceId: sessionInfo.serviceId, workspaceId: sessionInfo.workspaceId });
        }
        // invalid (missing secrets, no dir) → skip silently
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/opencode/webhook error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
