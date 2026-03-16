import { NextRequest, NextResponse } from "next/server";
import { listSessions, createSession } from "@/lib/services/opencode.service";
import { setService } from "@/lib/services/opencode-session.service";
import { getServiceById } from "@/lib/services/service.service";

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
    const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : undefined;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : undefined;

    if (!serviceId || !workspaceId) {
      return NextResponse.json(
        { error: "serviceId and workspaceId are required" },
        { status: 400 }
      );
    }

    const service = await getServiceById(serviceId, workspaceId);
    if (!service) {
      return NextResponse.json(
        { error: "Service not found or does not belong to this workspace" },
        { status: 400 }
      );
    }

    const directory = service.directory?.trim();
    if (!directory) {
      return NextResponse.json(
        { error: "Selected service has no directory set. Set a directory on the service first." },
        { status: 400 }
      );
    }

    const session = await createSession();
    const sessionId = session.session_id ?? (session as { id?: string }).id;
    if (!sessionId) {
      return NextResponse.json(
        { error: "OpenCode did not return a session id" },
        { status: 500 }
      );
    }

    await setService(sessionId, serviceId);

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("POST /api/opencode/sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
