import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { downloadServiceCode } from "@/lib/services/service.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query param is required" },
      { status: 400 },
    );
  }

  try {
    const zipBuffer = await downloadServiceCode(serviceId, workspaceId);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="service-${serviceId.slice(0, 8)}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err: any) {
    const message = err?.message ?? "Failed to download service code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
