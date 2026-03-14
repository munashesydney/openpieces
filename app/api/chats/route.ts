import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";
import { createAiChat, getAiChatsForWorkspace } from "@/lib/services/chat.service";
import { getWorkspaceOwnedByUser } from "@/lib/services/workspace.service";

export const runtime = "nodejs";

async function getAuthorizedWorkspaceUser(workspaceId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { userId: null, workspace: null };
  }

  const workspace = await getWorkspaceOwnedByUser(workspaceId, userId);
  return { userId, workspace };
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const { userId, workspace } = await getAuthorizedWorkspaceUser(workspaceId);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const chats = await getAiChatsForWorkspace(workspaceId, userId);
  return NextResponse.json({ chats });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { workspaceId?: string };
  const workspaceId = body.workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const { userId, workspace } = await getAuthorizedWorkspaceUser(workspaceId);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const chat = await createAiChat({
    workspaceId,
    userId,
  });

  return NextResponse.json(chat, { status: 201 });
}
