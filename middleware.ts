export { auth as middleware } from "./auth";

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
    "/((?!login|setup|api/auth|api/setup|api/opencode/webhook|api/s/|api/secrets|api/service-endpoints|api/health|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
