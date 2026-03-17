import type { NextRequest } from "next/server";
import { proxyToService } from "@/lib/services/service-proxy";

async function gateway(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; path: string[] }> }
) {
  const { serviceId, path } = await params;
  const upstreamPath = "/" + path.join("/");
  return proxyToService(request, serviceId, upstreamPath);
}

export const GET = gateway;
export const POST = gateway;
export const PUT = gateway;
export const PATCH = gateway;
export const DELETE = gateway;
