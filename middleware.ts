import { NextResponse, type NextRequest } from "next/server";
import { auth } from "./auth";

export default auth(async (req) => {
  // Service subdomain routing — detect subdomain and rewrite to internal
  // proxy handler (which runs in Node.js runtime and can query the DB).
  const res = rewriteServiceSubdomain(req);
  if (res) return res;

  if (
    process.env.NODE_ENV === "production" &&
    process.env.DEBUG_LOGS === "true"
  ) {
    console.log(`[request] ${req.method} ${req.nextUrl.pathname}`);
  }
});

export const config = {
  matcher: [
    /*
     * All paths except Next.js internals.
     * Service subdomains need full coverage (including static files).
     * Auth exclusions are handled inside the auth middleware.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

// ── Subdomain detection (runs in Edge Runtime — no DB access) ──

function rewriteServiceSubdomain(req: NextRequest) {
  const serviceDomain = (process.env.SERVICE_DOMAIN ?? "").trim();
  if (!serviceDomain) return null;

  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];

  if (!hostname.endsWith("." + serviceDomain)) return null;

  const serviceId = hostname.slice(
    0,
    hostname.length - serviceDomain.length - 1,
  );
  if (!serviceId || serviceId === "www") return null;

  // Build the internal proxy path.  Avoid double-slash for root requests.
  const subPath = req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname;
  const proxyPath = `/api/internal/proxy/${serviceId}${subPath}`;

  console.log(
    `[subdomain] Rewriting ${host}${req.nextUrl.pathname} → ${proxyPath}`,
  );

  const url = req.nextUrl.clone();
  url.pathname = proxyPath;
  return NextResponse.rewrite(url);
}
