import { NextResponse } from "next/server";
import { getBrainStats } from "@/lib/services/brain.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceOwner(workspaceId);
    const stats = await getBrainStats(workspaceId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get brain stats:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
