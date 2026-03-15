import { NextResponse } from "next/server";
import { getDirectory } from "@/lib/services/opencode-session.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const directory = await getDirectory(sessionId);
    if (directory === null) {
      return NextResponse.json(
        { error: "No directory set for this session" },
        { status: 404 }
      );
    }
    return NextResponse.json({ directory });
  } catch (error: any) {
    console.error(
      `GET /api/opencode/sessions/${await params.then((p) => p.sessionId)}/directory error:`,
      error
    );
    return NextResponse.json(
      { error: error.message || "Failed to get directory" },
      { status: 500 }
    );
  }
}
