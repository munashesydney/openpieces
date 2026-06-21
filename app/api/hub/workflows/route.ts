import { NextRequest, NextResponse } from "next/server";

const HUB_URL = process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000";
const COOKIE_NAME = "hub_access_token";

function serverUrl(): string {
  return HUB_URL.replace("localhost", "host.docker.internal");
}

/**
 * Proxies workflow search requests to the hub's public API.
 * The browser can't call host.docker.internal, so this routes through the app.
 * Forwards the user's hub access token so the Hub can show private items.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "12";

  const hubUrl = new URL("/api/v1/oauth/workflows", serverUrl());
  hubUrl.searchParams.set("search", search);
  hubUrl.searchParams.set("page", page);
  hubUrl.searchParams.set("limit", limit);

  const headers: Record<string, string> = {};
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(hubUrl.toString(), { headers });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to search workflows" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
