import { sendMessageWithContext } from "@/lib/services/opencode.service";
import { getSessionInfo } from "@/lib/services/opencode-session.service";
import type { ToolContext } from "@/lib/tools/registry";
import type { MessagesToolInput } from "./definition";

export async function executeMessages(input: MessagesToolInput, context: ToolContext) {
  const { action, sessionId, content } = input;

  if (action !== "send") {
    throw new Error(`Unknown action: ${action}. Valid action is: send.`);
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

  // Fire-and-forget: do not block the AI/tool call on long-running OpenCode processing
  sendMessageWithContext(sessionId, content.trim(), userId).catch((error) => {
    console.error("Failed to send OpenCode message:", error);
  });

  return {
    success: true,
    sessionId,
    message: "Message sent. OpenCode will process the request asynchronously.",
  };
}
