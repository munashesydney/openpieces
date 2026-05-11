import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { proxyToPort } from "@/lib/middleware/proxy";

/**
 * Handles proxy requests with no extra path (the service root).
 * e.g. /api/internal/proxy/{serviceId}
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;

  const result = await db
    .select({ port: services.port })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  const service = result[0];
  if (!service?.port) {
    return new Response("Service not available", { status: 503 });
  }

  return proxyToPort(request, service.port, "/");
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
