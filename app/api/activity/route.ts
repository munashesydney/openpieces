import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActivityLogsByType } from "@/lib/services/activity.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const recordType = searchParams.get("recordType");
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  if (!recordType) {
    return NextResponse.json({ error: "recordType is required" }, { status: 400 });
  }

  const activity = await getActivityLogsByType(workspaceId, recordType, limit, offset);
  return NextResponse.json(activity);
}
