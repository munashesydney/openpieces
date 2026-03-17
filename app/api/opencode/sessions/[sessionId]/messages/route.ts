import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessage } from "@/lib/services/opencode.service";
import { getDirectory } from "@/lib/services/opencode-session.service";
import { requireUser } from "@/lib/services/auth.service";
import { getDefaultWorkspace } from "@/lib/services/workspace.service";

const DIRECTORY_INSTRUCTION_PREFIX =
  "Before doing anything else: ensure the directory '";

const DIRECTORY_INSTRUCTION_SUFFIX =
  "' exists (create it if needed), then cd into it. You are only allowed to work inside this directory.\n\n";

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

    const directory = await getDirectory(sessionId);
    if (!directory) {
      return NextResponse.json(
        {
          error:
            "No directory set for this session. Create the session with a working directory.",
        },
        { status: 400 }
      );
    }

    const existingMessages = await getMessages(sessionId);
    const isFirstMessage =
      !Array.isArray(existingMessages) || existingMessages.length === 0;

    let fullContent = content;

    if (isFirstMessage) {
      const user = await requireUser();
      const workspace = await getDefaultWorkspace(user.id);

      const workspaceId = workspace?.id ?? "unknown";
      const contextBlock =
        `__OPENPIECES_CONTEXT_START__\n` +
        `workspaceId=${workspaceId}\n` +
        `userId=${user.id}\n` +
        `__OPENPIECES_CONTEXT_END__\n\n`;

      fullContent =
        DIRECTORY_INSTRUCTION_PREFIX +
        directory +
        DIRECTORY_INSTRUCTION_SUFFIX +
        contextBlock +
        content;
    }

    sendMessage(sessionId, fullContent).catch((e) =>
      console.error("sendMessage failed:", e)
    );

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error: any) {
    console.error(`POST /api/opencode/sessions/${await params.then(p => p.sessionId)}/messages error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
