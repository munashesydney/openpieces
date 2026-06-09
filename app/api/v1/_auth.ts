import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { authenticateByApiKey } from "@/lib/services/api-key.service";

export const runtime = "nodejs";

export interface V1Auth {
  userId: string;
  /** Set when authenticated via API key (key is scoped to one workspace). */
  workspaceId?: string;
}

/**
 * Authenticate a v1 API request.
 *   - API key (Bearer): derives workspaceId from the key itself
 *   - Session cookie: returns userId only; caller must validate workspace
 *
 * Returns { userId, workspaceId? } on success.
 * Returns NextResponse (401) on failure.
 */
export async function authenticateV1Request(
  request: Request,
): Promise<V1Auth | NextResponse> {
  // ── 1. Bearer API key auth ──────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7).trim();
    if (!rawKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const result = await authenticateByApiKey(rawKey);
    if (!result) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    return result;
  }

  // ── 2. Cookie session auth ──────────────────────────────────────────────
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId };
}
