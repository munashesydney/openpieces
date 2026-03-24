import { NextResponse } from "next/server";
import { getBrainEntries } from "@/lib/services/brain.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceOwner(workspaceId);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const entries = await getBrainEntries(workspaceId, page, 20);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to get brain entries:", error);
    return NextResponse.json({ error: "Failed to get entries" }, { status: 500 });
  }
}
