import { NextRequest, NextResponse } from "next/server";
import { proxyToPort } from "@/lib/middleware/proxy";
import { getServiceByIdOnly } from "@/lib/services/service.service";

/**
 * Proxies an incoming Next.js request to a running service instance.
 *
 * - Resolves the service by ID.
 * - Ensures the service has a port assigned.
 * - Delegates to proxyToPort for the actual forwarding.
 */
export async function proxyToService(
  request: NextRequest,
  serviceId: string,
  upstreamPath: string,
): Promise<NextResponse> {
  const service = await getServiceByIdOnly(serviceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  if (!service.port) {
    return NextResponse.json(
      { error: "Service is not running" },
      { status: 503 },
    );
  }

  return proxyToPort(request, service.port, upstreamPath);
}
