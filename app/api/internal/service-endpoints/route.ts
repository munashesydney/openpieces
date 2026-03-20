import { NextRequest, NextResponse } from "next/server";
import {
  getEndpointsByServiceId,
  getEndpointById,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
} from "@/lib/services/service-endpoint.service";

type ServiceEndpointsAction =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete";

type ServiceEndpointsRequestBody = {
  action: ServiceEndpointsAction;
  workspaceId: string;
  serviceId: string;
  endpointId?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path?: string;
  description?: string;
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

  let body: ServiceEndpointsRequestBody;
  try {
    body = (await request.json()) as ServiceEndpointsRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
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
        const result = await getEndpointsByServiceId(serviceId, workspaceId);
        return NextResponse.json(result);
      }

      case "get": {
        if (!body.endpointId) {
          return NextResponse.json(
            { error: "endpointId is required for action 'get'" },
            { status: 400 }
          );
        }
        const endpoint = await getEndpointById(
          body.endpointId,
          serviceId,
          workspaceId
        );
        if (!endpoint) {
          return NextResponse.json(
            { error: "Endpoint not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(endpoint);
      }

      case "create": {
        if (!body.method || !body.path) {
          return NextResponse.json(
            { error: "method and path are required for action 'create'" },
            { status: 400 }
          );
        }
        const created = await createEndpoint({
          serviceId,
          method: body.method,
          path: body.path,
          description: body.description ?? "",
        });
        return NextResponse.json(created, { status: 201 });
      }

      case "update": {
        if (!body.endpointId) {
          return NextResponse.json(
            { error: "endpointId is required for action 'update'" },
            { status: 400 }
          );
        }
        const updateData: {
          method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
          path?: string;
          description?: string;
        } = {};
        if (body.method != null) updateData.method = body.method;
        if (body.path != null) updateData.path = body.path;
        if (body.description != null) updateData.description = body.description;
        if (Object.keys(updateData).length === 0) {
          return NextResponse.json(
            { error: "method, path, or description is required for action 'update'" },
            { status: 400 }
          );
        }
        const updated = await updateEndpoint(
          body.endpointId,
          serviceId,
          workspaceId,
          updateData
        );
        if (!updated) {
          return NextResponse.json(
            { error: "Endpoint not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(updated);
      }

      case "delete": {
        if (!body.endpointId) {
          return NextResponse.json(
            { error: "endpointId is required for action 'delete'" },
            { status: 400 }
          );
        }
        const ok = await deleteEndpoint(body.endpointId, serviceId, workspaceId);
        if (!ok) {
          return NextResponse.json(
            { error: "Endpoint not found or delete failed" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, deleted: body.endpointId });
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
  } catch (err: unknown) {
    console.error("POST /api/internal/service-endpoints error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
