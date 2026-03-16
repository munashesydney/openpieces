import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServiceById } from "@/lib/services/service.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  if (!service.port) {
    return NextResponse.json({ healthy: false, reason: "not started", port: null });
  }

  try {
    const serviceHost = process.env.SERVICE_HOST ?? "http://localhost";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${serviceHost}:${service.port}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      return NextResponse.json({ healthy: true, port: service.port });
    }
    return NextResponse.json({ healthy: false, reason: `status ${res.status}`, port: service.port });
  } catch {
    return NextResponse.json({ healthy: false, reason: "unreachable", port: service.port });
  }
}
