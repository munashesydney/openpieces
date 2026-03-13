import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { getUserWorkspaces } from "../../../lib/services/workspace.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const workspaces = await getUserWorkspaces(session.user.id);
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("[WORKSPACES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
