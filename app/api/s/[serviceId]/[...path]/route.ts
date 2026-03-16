import { NextRequest, NextResponse } from "next/server";
import { getServiceByIdOnly } from "@/lib/services/service.service";

const serviceHost = process.env.SERVICE_HOST ?? "http://localhost";

async function gateway(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string; path: string[] }> }
) {
  const { serviceId, path } = await params;

  const service = await getServiceByIdOnly(serviceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  if (!service.port) {
    return NextResponse.json({ error: "Service is not running" }, { status: 503 });
  }

  const upstreamPath = "/" + path.join("/");
  const upstreamSearch = request.nextUrl.search;

  const upstreamUrl = `${serviceHost}:${service.port}${upstreamPath}${upstreamSearch}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      signal: controller.signal,
      // @ts-expect-error - needed for streaming bodies
      duplex: "half",
    });

    clearTimeout(timer);

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Upstream request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Service unreachable" }, { status: 502 });
  }
}

export const GET = gateway;
export const POST = gateway;
export const PUT = gateway;
export const PATCH = gateway;
export const DELETE = gateway;
