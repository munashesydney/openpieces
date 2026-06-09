import { NextResponse } from "next/server";
import { authenticateV1Request } from "../_auth";
import {
  getAiChatsForWorkspace,
  createAiChat,
} from "@/lib/services/chat.service";

export const runtime = "nodejs";

/** GET /api/v1/chats — list chats */
export async function GET(request: Request) {
  const authResult = await authenticateV1Request(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const workspaceId = authResult.workspaceId ?? searchParams.get("workspaceId");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const agentType = searchParams.get("agentType") ?? undefined;

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required (query param or API key)" },
      { status: 400 },
    );
  }

  const result = await getAiChatsForWorkspace(
    workspaceId,
    authResult.userId,
    page,
    pageSize,
    agentType,
  );
  return NextResponse.json(result);
}

/** POST /api/v1/chats — create a new chat */
export async function POST(request: Request) {
  const authResult = await authenticateV1Request(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: { workspaceId?: string; agentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const workspaceId = authResult.workspaceId ?? body.workspaceId;
  const agentType = body.agentType ?? "orchestrator";

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required (body or API key)" },
      { status: 400 },
    );
  }

  try {
    const chat = await createAiChat(
      { workspaceId, userId: authResult.userId },
      agentType,
    );
    return NextResponse.json({ chat }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
