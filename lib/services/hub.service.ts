import { cookies } from "next/headers";

const HUB_URL = process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000";
const CLIENT_ID = process.env.OPENPIECES_HUB_CLIENT_ID ?? "";
export const REDIRECT_URI =
  process.env.OPENPIECES_HUB_REDIRECT_URI ??
  "http://localhost:3141/api/hub/callback";

const COOKIE_NAME = "hub_access_token";
const USER_COOKIE_NAME = "hub_user_info";

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
): Promise<{ accessToken: string; email?: string; name?: string } | null> {
  // Server-to-server — use Docker-friendly host
  const res = await fetch(`${serverUrl()}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, client_secret: CLIENT_ID }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    user?: { email?: string; name?: string };
  };
  if (!data.access_token) return null;

  return {
    accessToken: data.access_token,
    email: data.user?.email,
    name: data.user?.name,
  };
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

export async function storeHubUserInfo(info: {
  email?: string;
  name?: string;
}) {
  const jar = await cookies();
  if (info.email) {
    jar.set(USER_COOKIE_NAME, JSON.stringify(info), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  }
}

export async function getHubUserInfo(): Promise<{
  email?: string;
  name?: string;
} | null> {
  const jar = await cookies();
  const raw = jar.get(USER_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearHubUserInfo() {
  const jar = await cookies();
  jar.set(USER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// ── Push piece ─────────────────────────────────

export async function pushPiece(
  token: string,
  data: {
    title: string;
    description: string;
    zipBuffer: Buffer;
    filename: string;
    category?: string;
    pieceId?: string;
    endpoints?: Array<{
      method: string;
      path: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
    requiredSecrets?: Array<{ secretKey: string }>;
  },
): Promise<{
  ok: boolean;
  error?: string;
  notOwner?: boolean;
  hubUpdatedAt?: string;
  hubPieceId?: string;
}> {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("description", data.description);
  if (data.category) formData.append("category", data.category);
  formData.append(
    "file",
    new Blob([new Uint8Array(data.zipBuffer)], { type: "application/zip" }),
    data.filename,
  );
  if (data.endpoints) {
    formData.append("endpoints", JSON.stringify(data.endpoints));
  }
  if (data.requiredSecrets) {
    formData.append("requiredSecrets", JSON.stringify(data.requiredSecrets));
  }
  if (data.pieceId) {
    formData.append("pieceId", data.pieceId);
  }

  const res = await fetch(`${serverUrl()}/api/v1/oauth/pieces`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (err.error === "not_owner") {
      return { ok: false, notOwner: true, error: err.message };
    }
    return { ok: false, error: err.error ?? "Failed to push piece" };
  }

  // Get the hub piece's id and updatedAt from the response
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    updatedAt?: string;
  };
  return { ok: true, hubUpdatedAt: body.updatedAt, hubPieceId: body.id };
}

// ── Pull piece ─────────────────────────────────

export type HubPiece = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: "TRIGGER" | "ACTION";
  codeUrl: string;
  stars: number;
  installCount: number;
  createdAt: string;
  updatedAt: string;
  endpoints?: Array<{
    id?: string;
    method: string;
    path: string;
    description: string;
    inputSchema?: Record<string, unknown>;
  }>;
  requiredSecrets?: Array<{
    id?: string;
    secretKey: string;
  }>;
};

export type SearchPiecesResult = {
  pieces: HubPiece[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Search pieces on the hub by title (public endpoint, no auth required).
 */
export async function searchPieces(
  query: string,
  options?: { page?: number; limit?: number },
): Promise<SearchPiecesResult> {
  const url = new URL("/api/v1/oauth/pieces", serverUrl());
  url.searchParams.set("search", query);
  url.searchParams.set("page", String(options?.page ?? 1));
  url.searchParams.set("limit", String(options?.limit ?? 20));

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { pieces: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  return res.json() as Promise<SearchPiecesResult>;
}

/**
 * Fetch a single piece by its UUID (public endpoint, no auth required).
 */
export async function fetchPieceById(id: string): Promise<HubPiece | null> {
  const res = await fetch(`${serverUrl()}/api/v1/oauth/pieces/${id}`);
  if (!res.ok) return null;

  return res.json() as Promise<HubPiece>;
}

/**
 * Download the piece's ZIP archive from its codeUrl.
 */
export async function downloadPieceZip(
  codeUrl: string,
): Promise<Buffer | null> {
  try {
    const res = await fetch(codeUrl);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
