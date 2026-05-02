import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, storeToken } from "@/lib/services/hub.service";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    // User denied or an error occurred
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const token = await exchangeCodeForToken(code);
  if (!token) {
    return NextResponse.json({ error: "failed to exchange code" }, { status: 400 });
  }

  await storeToken(token);

  // Redirect back to the referring page — we store the original URL in a state param
  const state = url.searchParams.get("state");
  const redirectTo = state ? decodeURIComponent(state) : "/";

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
