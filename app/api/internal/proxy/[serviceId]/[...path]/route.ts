import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { proxyToPort } from "@/lib/middleware/proxy";

/**
 * Internal route handler for service subdomain proxy requests.
 *
 * The middleware rewrites requests like
 *   {serviceId}.example.com/game → /api/internal/proxy/{serviceId}/game
 * This handler (running in Node.js runtime) does the DB lookup and proxies
 * to the worker — something the Edge Runtime middleware cannot do.
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; path: string[] }> },
) {
  const { serviceId, path } = await params;
  const upstreamPath = path.length > 0 ? `/${path.join("/")}` : "/";

  const result = await db
    .select({ port: services.port })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  const service = result[0];
  if (!service?.port) {
    return new Response("Service not available", { status: 503 });
  }

  return proxyToPort(request, service.port, upstreamPath);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
