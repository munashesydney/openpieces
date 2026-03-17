import { NextRequest, NextResponse } from "next/server";
import {
  getSecrets,
  getSecretById,
  createSecret,
  updateSecret,
  deleteSecret,
} from "@/lib/services/secret.service";
import { ValidationError } from "@/lib/errors/validation-error";

type SecretsAction =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete";

type SecretsRequestBody = {
  action: SecretsAction;
  workspaceId: string;
  userId: string;
  secretId?: string;
  key?: string;
  value?: string;
  page?: number;
  limit?: number;
};

const INTERNAL_HEADER_NAME = "x-internal-secret";

function isAuthorized(request: NextRequest): boolean {
  const headerValue = request.headers.get(INTERNAL_HEADER_NAME) ?? "";
  const expected = process.env.INTERNAL_API_KEY ?? "";
  return Boolean(expected) && headerValue === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: SecretsRequestBody;
  try {
    body = (await request.json()) as SecretsRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { action, workspaceId, userId } = body;

  if (!action || !workspaceId || !userId) {
    return NextResponse.json(
      { error: "action, workspaceId, and userId are required" },
      { status: 400 }
    );
  }

  try {
    switch (action) {
      case "list": {
        const page = Number.isFinite(body.page) ? body.page! : 1;
        const limit = Number.isFinite(body.limit) ? body.limit! : 50;
        const result = await getSecrets(workspaceId, userId, page, limit);
        // value is already decrypted in the service; return as-is for internal use
        return NextResponse.json(result);
      }

      case "get": {
        if (!body.secretId) {
          return NextResponse.json(
            { error: "secretId is required for action 'get'" },
            { status: 400 }
          );
        }
        const secret = await getSecretById(body.secretId, workspaceId, userId);
        if (!secret) {
          return NextResponse.json(
            { error: "Secret not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(secret);
      }

      case "create": {
        if (!body.key || body.value == null) {
          return NextResponse.json(
            { error: "key and value are required for action 'create'" },
            { status: 400 }
          );
        }
        const created = await createSecret({
          workspaceId,
          userId,
          key: body.key,
          value: body.value,
        });
        return NextResponse.json(created, { status: 201 });
      }

      case "update": {
        if (!body.secretId) {
          return NextResponse.json(
            { error: "secretId is required for action 'update'" },
            { status: 400 }
          );
        }
        if (!body.key && body.value == null) {
          return NextResponse.json(
            { error: "key or value is required for action 'update'" },
            { status: 400 }
          );
        }

        const existing = await getSecretById(body.secretId, workspaceId, userId);
        if (!existing) {
          return NextResponse.json(
            { error: "Secret not found" },
            { status: 404 }
          );
        }

        const updated = await updateSecret({
          id: body.secretId,
          workspaceId,
          userId,
          key: body.key ?? existing.key,
          value: body.value ?? existing.value,
        });
        return NextResponse.json(updated);
      }

      case "delete": {
        if (!body.secretId) {
          return NextResponse.json(
            { error: "secretId is required for action 'delete'" },
            { status: 400 }
          );
        }
        const ok = await deleteSecret(body.secretId, workspaceId, userId);
        if (!ok) {
          return NextResponse.json(
            { error: "Secret not found or delete failed" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, deleted: body.secretId });
      }

      default: {
        return NextResponse.json(
          {
            error:
              "Unknown action. Valid actions are: list, get, create, update, delete.",
          },
          { status: 400 }
        );
      }
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }
    console.error("POST /api/secrets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

