import {
  sendMessageWithContext,
  getMessages,
  getMessagesForAi,
} from "@/lib/services/opencode.service";
import {
  getSessionInfo,
  serviceHasWorkingSession,
} from "@/lib/services/opencode-session.service";
import { db } from "@/lib/db";
import { opencodeSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ToolContext } from "@/lib/tools/registry";
import type { MessagesToolInput } from "./definition";

export async function executeMessages(
  input: MessagesToolInput,
  context: ToolContext,
) {
  const { action, sessionId, content } = input;

  if (action === "list") {
    const { workspaceId } = context;
    if (!workspaceId) {
      throw new Error("Workspace ID is required in context");
    }
    const session = await getSessionInfo(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const messages = await getMessages(sessionId);
    const formatted = getMessagesForAi(messages);
    return {
      success: true,
      sessionId,
      messages: formatted,
    };
  }

  if (action !== "send") {
    throw new Error(
      `Unknown action: ${action}. Valid actions are: send, list.`,
    );
  }
  const { workspaceId, userId } = context;

  if (!workspaceId) {
    throw new Error("Workspace ID is required in context");
  }

  const session = await getSessionInfo(sessionId, workspaceId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (!content?.trim()) {
    throw new Error("content is required");
  }

  // Check if service already has a working session before sending
  const hasWorking = await serviceHasWorkingSession(session.serviceId);
  if (hasWorking) {
    throw new Error(
      "Cannot send message: service is already processing another request",
    );
  }

  // Fire-and-forget: do not block the AI/tool call on long-running OpenCode processing
  sendMessageWithContext(sessionId, content.trim(), userId).catch((error) => {
    console.error("Failed to send OpenCode message:", error);
  });

  // Update DB status so UI polling fallback picks it up (DB is single source of truth)
  await db
    .update(opencodeSessions)
    .set({ status: "working", updatedAt: new Date() })
    .where(eq(opencodeSessions.sessionId, sessionId));

  return {
    success: true,
    sessionId,
    message: "Message sent. OpenCode will process the request asynchronously.",
  };
}
