import { NextRequest, NextResponse } from "next/server";

const HUB_URL = process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000";
const COOKIE_NAME = "hub_access_token";

/**
 * Server-to-server calls swap localhost → host.docker.internal
 * so Docker containers can reach the host machine.
 */
function serverUrl(): string {
  return HUB_URL.replace("localhost", "host.docker.internal");
}

/**
 * Proxies piece search requests to the hub's public API.
 * The browser can't call host.docker.internal, so this routes through the app.
 * Forwards the user's hub access token so the Hub can show private items.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "12";
  const category = url.searchParams.get("category");

  const hubUrl = new URL("/api/v1/oauth/pieces", serverUrl());
  hubUrl.searchParams.set("search", search);
  hubUrl.searchParams.set("page", page);
  hubUrl.searchParams.set("limit", limit);
  if (category) hubUrl.searchParams.set("category", category);

  const headers: Record<string, string> = {};
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(hubUrl.toString(), { headers });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to search pieces" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
