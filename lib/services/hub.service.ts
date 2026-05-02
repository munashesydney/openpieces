import { cookies } from "next/headers";

const HUB_URL = process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000";
const CLIENT_ID = process.env.OPENPIECES_HUB_CLIENT_ID ?? "";
const REDIRECT_URI =
  process.env.OPENPIECES_HUB_REDIRECT_URI ??
  "http://localhost:3141/api/hub/callback";

const COOKIE_NAME = "hub_access_token";

// ── Helpers ────────────────────────────────────

/**
 * Browser-bound URLs (authorize redirect) use HUB_URL as-is.
 * Server-to-server calls swap localhost → host.docker.internal
 * so Docker containers can reach the host machine.
 */
function serverUrl(): string {
  return HUB_URL.replace("localhost", "host.docker.internal");
}

// ── OAuth helpers ──────────────────────────────

export function getAuthorizeUrl(): string {
  // Browser-facing — keep original localhost
  const url = new URL("/api/v1/oauth/authorize", HUB_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
): Promise<string | null> {
  // Server-to-server — use Docker-friendly host
  const res = await fetch(`${serverUrl()}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, client_secret: CLIENT_ID }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

// ── Token storage (cookie) ─────────────────────

export async function getStoredToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function storeToken(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

// ── Push piece ─────────────────────────────────

export async function pushPiece(
  token: string,
  data: { title: string; description: string; code: string },
): Promise<{ ok: boolean; error?: string }> {
  // Server-to-server — use Docker-friendly host
  const res = await fetch(`${serverUrl()}/api/v1/oauth/pieces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: err.error ?? "Failed to push piece" };
  }

  return { ok: true };
}
