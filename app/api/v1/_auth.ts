import { NextResponse } from "next/server";
import { authenticateByApiKey } from "@/lib/services/api-key.service";

export const runtime = "nodejs";

export interface V1Auth {
  userId: string;
  workspaceId: string;
}

/**
 * Authenticate a v1 API request via Bearer API key.
 * The key is scoped to a single workspace — workspaceId is derived from it.
 *
 * Returns { userId, workspaceId } on success.
 * Returns NextResponse (401) on failure.
 */
export async function authenticateV1Request(
  request: Request,
): Promise<V1Auth | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid Authorization header. Use: Bearer op_api_...",
      },
      { status: 401 },
    );
  }

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
