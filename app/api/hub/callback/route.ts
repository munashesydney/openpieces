import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  storeToken,
  storeHubUserInfo,
} from "@/lib/services/hub.service";

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

  const result = await exchangeCodeForToken(code);
  if (!result) {
    return NextResponse.json(
      { error: "failed to exchange code" },
      { status: 400 },
    );
  }

  await storeToken(result.accessToken);
  if (result.email) {
    await storeHubUserInfo({ email: result.email, name: result.name });
  }

  // Redirect back — prefer returnTo (from reconnect flow), fallback to state
  const returnTo = url.searchParams.get("returnTo");
  const state = url.searchParams.get("state");
  const redirectTo = returnTo
    ? decodeURIComponent(returnTo)
    : state
      ? decodeURIComponent(state)
      : "/";

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
