import { NextRequest, NextResponse } from "next/server";
import { getServiceByIdOnly } from "@/lib/services/service.service";

const serviceHost = process.env.SERVICE_HOST ?? "http://localhost";

/**
 * Proxies an incoming Next.js request to a running service instance.
 *
 * - Resolves the service by ID.
 * - Ensures the service has a port assigned.
 * - Forwards method, headers, body, and query string.
 * - Streams the upstream response body back to the client.
 */
export async function proxyToService(
  request: NextRequest,
  serviceId: string,
  upstreamPath: string
): Promise<NextResponse> {
  const service = await getServiceByIdOnly(serviceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  if (!service.port) {
    return NextResponse.json({ error: "Service is not running" }, { status: 503 });
  }

  const normalizedPath = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
  const upstreamSearch = request.nextUrl.search;
  const upstreamUrl = `${serviceHost}:${service.port}${normalizedPath}${upstreamSearch}`;

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

    // Buffer the full body to avoid Docker/internal proxy truncation issues
    // with chunked transfer encoding.
    const body = await upstreamResponse.arrayBuffer();

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("transfer-encoding");
    // Node's fetch auto-decompresses the body, so strip the encoding header
    // to prevent the browser from trying to decompress an already-decoded body.
    responseHeaders.delete("content-encoding");
    // Set content-length since we stripped transfer-encoding and are buffering.
    responseHeaders.set("content-length", String(body.byteLength));

    return new NextResponse(body, {
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

