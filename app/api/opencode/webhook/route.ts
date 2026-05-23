import { NextRequest, NextResponse } from "next/server";
import { broadcastSessionEvent } from "@/lib/opencode/event-stream";
import { db } from "@/lib/db";
import { opencodeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMessages } from "@/lib/services/opencode.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId =
      body.sessionId ?? body.session_id ?? body.properties?.sessionID ?? null;
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    const eventType = body.type ?? body.event?.type ?? null;

    // Determine the new status and side-effects from the event
    let newStatus: string | null = null;
    let shouldFetchMessages = false;
    let shouldSpawnService = false;

    if (eventType === "session.status") {
      const statusType = body.properties?.status?.type;
      if (statusType === "busy") {
        newStatus = "busy";
      } else if (statusType === "idle") {
        // Agent is idle/waiting — fetch latest messages without changing status
        // (only the flat session.idle event advances the session status)
        shouldFetchMessages = true;
      } else if (statusType === "retry") {
        // Retry is an error-like state in OpenCode
        newStatus = "error";
        shouldFetchMessages = true;
      }
    } else if (eventType === "session.idle") {
      // Flat idle event — agent finished working, spawn service
      newStatus = "idle";
      shouldFetchMessages = true;
      shouldSpawnService = true;
    } else if (eventType === "session.error" || eventType === "error") {
      newStatus = "error";
      shouldFetchMessages = true;
    }

    if (newStatus || shouldFetchMessages) {
      // Fetch the last message if needed
      let lastMessage: string | null = null;
      if (shouldFetchMessages) {
        const rawMessages = await getMessages(sessionId);
        const lastMsg = rawMessages[rawMessages.length - 1];
        lastMessage = lastMsg
          ? (lastMsg.parts || [])
              .filter((p: any) => p.type === "text")
              .map((p: any) => p.text)
              .join("\n") || null
          : null;
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (newStatus) {
        updates.status = newStatus;
      }

      if (lastMessage !== null) {
        updates.lastMessage = lastMessage;
        updates.lastMessageAt = new Date();
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

    // After session completes (flat session.idle only), spawn the linked service
    if (shouldSpawnService) {
      const { getSessionInfoById } =
        await import("@/lib/services/opencode-session.service");
      const { validateServiceForSpawn } =
        await import("@/lib/services/service.service");
      const { enqueueServiceSpawn } = await import("@/lib/queues/pg-boss");

      getSessionInfoById(sessionId)
        .then(async (sessionInfo) => {
          if (!sessionInfo?.serviceId) return;
          const validation = await validateServiceForSpawn(
            sessionInfo.serviceId,
            sessionInfo.workspaceId,
          );
          if (validation.valid) {
            await enqueueServiceSpawn({
              serviceId: sessionInfo.serviceId,
              workspaceId: sessionInfo.workspaceId,
              sessionId,
            });
          }
          // invalid (missing secrets, no dir) → skip silently
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/opencode/webhook error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
