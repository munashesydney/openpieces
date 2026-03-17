import type { NextRequest } from "next/server";
import { proxyToService } from "@/lib/services/service-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  // Proxy root path "/" for this service
  return proxyToService(request, serviceId, "/");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  return proxyToService(request, serviceId, "/");
}

export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;

