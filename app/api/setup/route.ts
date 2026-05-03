import { NextRequest, NextResponse } from "next/server";
import { countUsers, createUser } from "../../../lib/services/user.service";
import { createWorkspace } from "../../../lib/services/workspace.service";
import { db } from "@/lib/db";
import { workspaceSettings } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      workspaceName,
      timezone,
      agentName,
      userNickname,
    } = body;

    if (!name || !email || !password || !workspaceName) {
      return NextResponse.json(
        { error: "Name, email, password, and workspace name are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    // Silently redirect if a user already exists
    const existing = await countUsers();
    if (existing > 0) {
      return NextResponse.json({ redirect: "/login" }, { status: 409 });
    }

    const user = await createUser({ name, email, password });

    const workspace = await createWorkspace({
      name: workspaceName.trim(),
      userId: user.id,
      agentName: agentName?.trim(),
      userNickname: userNickname?.trim(),
    });

    // Create workspace settings with the chosen timezone
    await db.insert(workspaceSettings).values({
      workspaceId: workspace.id,
      timezone: timezone || "UTC",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[setup] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
