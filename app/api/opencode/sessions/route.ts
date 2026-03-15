import { NextRequest, NextResponse } from "next/server";
import { listSessions, createSession } from "@/lib/services/opencode.service";
import { setDirectory } from "@/lib/services/opencode-session.service";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error("GET /api/opencode/sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const directory = typeof body.directory === "string" ? body.directory.trim() : undefined;

    const session = await createSession();
    const sessionId = session.session_id ?? (session as { id?: string }).id;
    if (!sessionId) {
      return NextResponse.json(
        { error: "OpenCode did not return a session id" },
        { status: 500 }
      );
    }

    if (directory) {
      await setDirectory(sessionId, directory);
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("POST /api/opencode/sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
