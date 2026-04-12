import { auth } from "./auth";

export default auth((req) => {
  if (process.env.NODE_ENV === "production" && process.env.DEBUG_LOGS === "true") {
    console.log(`[request] ${req.method} ${req.nextUrl.pathname}`);
  }
});

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login and /setup (public auth pages)
     * - /api/auth/* (Auth.js handlers)
     * - /api/setup (first-run setup endpoint)
     * - /_next/* (Next.js internals)
     * - Static files with extensions (e.g. .ico, .png, .svg)
     */
    "/((?!login|setup|api/auth|api/setup|api/opencode/webhook|api/s/|api/internal/secrets|api/internal/service-endpoints|api/internal/service-required-secrets|api/internal/chat|api/health|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
