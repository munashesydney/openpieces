import { NextRequest, NextResponse } from "next/server";

const HUB_URL = process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000";

function serverUrl(): string {
  return HUB_URL.replace("localhost", "host.docker.internal");
}

/**
 * Proxies single workflow fetch to the hub's API.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const res = await fetch(`${serverUrl()}/api/v1/oauth/workflows/${id}`);

  if (!res.ok) {
    return NextResponse.json(
      { error: "Workflow not found" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
