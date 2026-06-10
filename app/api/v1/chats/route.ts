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
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const agentType = searchParams.get("agentType") ?? undefined;

  const result = await getAiChatsForWorkspace(
    authResult.workspaceId,
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

  let body: { agentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agentType = body.agentType ?? "orchestrator";

  try {
    const chat = await createAiChat(
      { workspaceId: authResult.workspaceId, userId: authResult.userId },
      agentType,
    );
    return NextResponse.json({ chat }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
