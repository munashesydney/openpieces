import { NextResponse } from "next/server";
import { getOrCreateBrainSettings, updateBrainSettings } from "@/lib/services/brain.service";
import { requireWorkspaceOwner } from "@/lib/services/auth.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceOwner(workspaceId);
    const settings = await getOrCreateBrainSettings(workspaceId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to get brain settings:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceOwner(workspaceId);

    const body = await request.json();
    const { ingestionEnabled, ingestionIntervalMinutes, reinforcementEnabled, reinforcementIntervalHours, reinforcementBatchSize } = body;

    const updates: Parameters<typeof updateBrainSettings>[1] = {};

    if (typeof ingestionEnabled === "boolean") updates.ingestionEnabled = ingestionEnabled;
    if (typeof ingestionIntervalMinutes === "number") updates.ingestionIntervalMinutes = ingestionIntervalMinutes;
    if (typeof reinforcementEnabled === "boolean") updates.reinforcementEnabled = reinforcementEnabled;
    if (typeof reinforcementIntervalHours === "number") updates.reinforcementIntervalHours = reinforcementIntervalHours;
    if (typeof reinforcementBatchSize === "number") updates.reinforcementBatchSize = reinforcementBatchSize;

    const settings = await updateBrainSettings(workspaceId, updates);

    if (!settings) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update brain settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
