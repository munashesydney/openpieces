import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequiredSecrets, addRequiredSecret, removeRequiredSecret } from "@/lib/services/service-required-secrets.service";
import { getServiceById } from "@/lib/services/service.service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const requiredSecrets = await getRequiredSecrets(serviceId);
  return NextResponse.json({ data: requiredSecrets });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const body = await request.json();
  const { secretKey } = body;

  if (!secretKey) {
    return NextResponse.json({ error: "secretKey is required" }, { status: 400 });
  }

  try {
    const requiredSecret = await addRequiredSecret(serviceId, secretKey);
    return NextResponse.json({ data: requiredSecret });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add required secret";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
  }

  const service = await getServiceById(serviceId, workspaceId);
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  try {
    const deleted = await removeRequiredSecret(id);
    if (!deleted) {
      return NextResponse.json({ error: "Required secret not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove required secret";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}