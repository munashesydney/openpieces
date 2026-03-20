import { NextRequest, NextResponse } from "next/server";
import {
  addRequiredSecret,
  getRequiredSecrets,
  removeRequiredSecret,
} from "@/lib/services/service-required-secrets.service";
import { ValidationError } from "@/lib/errors/validation-error";

type Action = "list" | "add" | "remove";

type RequestBody = {
  action: Action;
  workspaceId: string;
  serviceId: string;
  secretKey?: string;
  id?: string;
};

const INTERNAL_HEADER_NAME = "x-internal-secret";

function isAuthorized(request: NextRequest): boolean {
  const headerValue = request.headers.get(INTERNAL_HEADER_NAME) ?? "";
  const expected = process.env.INTERNAL_API_KEY ?? "";
  return Boolean(expected) && headerValue === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, workspaceId, serviceId } = body;

  if (!action || !workspaceId || !serviceId) {
    return NextResponse.json(
      { error: "action, workspaceId, and serviceId are required" },
      { status: 400 }
    );
  }

  try {
    switch (action) {
      case "list": {
        const secrets = await getRequiredSecrets(serviceId);
        return NextResponse.json({ data: secrets });
      }

      case "add": {
        if (!body.secretKey) {
          return NextResponse.json(
            { error: "secretKey is required for action 'add'" },
            { status: 400 }
          );
        }
        const created = await addRequiredSecret(serviceId, body.secretKey);
        return NextResponse.json(created, { status: 201 });
      }

      case "remove": {
        if (!body.id) {
          return NextResponse.json(
            { error: "id is required for action 'remove'" },
            { status: 400 }
          );
        }
        const ok = await removeRequiredSecret(body.id);
        if (!ok) {
          return NextResponse.json(
            { error: "Required secret not found or delete failed" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, deleted: body.id });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action. Valid actions are: list, add, remove." },
          { status: 400 }
        );
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/internal/service-required-secrets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}