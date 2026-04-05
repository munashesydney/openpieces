import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { getAiChatsForWorkspace } from "@/lib/services/chat.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const agentType = searchParams.get("agentType") ?? undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const result = await getAiChatsForWorkspace(workspaceId, userId, page, pageSize, agentType);
  return NextResponse.json(result);
}
