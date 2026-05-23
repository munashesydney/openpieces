import { NextResponse } from "next/server";
import { abortOpenCodeSession } from "@/lib/services/opencode-session.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const aborted = await abortOpenCodeSession(sessionId);

    if (!aborted) {
      return NextResponse.json(
        { error: "Failed to abort session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ aborted: true });
  } catch (error: any) {
    console.error(
      `POST /api/opencode/sessions/${await params.then((p) => p.sessionId)}/abort error:`,
      error,
    );
    return NextResponse.json(
      { error: error.message || "Failed to abort session" },
      { status: 500 },
    );
  }
}
