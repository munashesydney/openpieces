import { NextResponse } from "next/server";
import { listSessions, createSession } from "@/lib/services/opencode.service";

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

export async function POST() {
  try {
    const session = await createSession();
    return NextResponse.json(session);
  } catch (error: any) {
    console.error("POST /api/opencode/sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
