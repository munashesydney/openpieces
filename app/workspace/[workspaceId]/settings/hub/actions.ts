"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "hub_access_token";
const USER_COOKIE_NAME = "hub_user_info";

export async function getHubConnectionStatus(): Promise<{
  connected: boolean;
  hubUrl: string;
  email?: string;
  name?: string;
}> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  let email: string | undefined;
  let name: string | undefined;
  try {
    const raw = jar.get(USER_COOKIE_NAME)?.value;
    if (raw) {
      const parsed = JSON.parse(raw);
      email = parsed.email;
      name = parsed.name;
    }
  } catch {
    // ignore
  }
  return {
    connected: !!token,
    hubUrl: process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000",
    email,
    name,
  };
}

export async function disconnectHubAction(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  jar.set(USER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function reconnectHubAction(
  _prevState: unknown,
  formData: FormData,
): Promise<{ redirectUrl?: string }> {
  const returnTo = (formData.get("returnTo") as string) ?? "/";
  const url = new URL(
    "/api/v1/oauth/authorize",
    process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000",
  );
  url.searchParams.set("client_id", process.env.OPENPIECES_HUB_CLIENT_ID ?? "");
  url.searchParams.set(
    "redirect_uri",
    `http://localhost:3141/api/hub/callback?returnTo=${encodeURIComponent(returnTo)}`,
  );
  return { redirectUrl: url.toString() };
}
