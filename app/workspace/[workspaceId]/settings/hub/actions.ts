"use server";

import { cookies } from "next/headers";
import { checkHubSetup } from "@/lib/services/hub-setup.service";
import { REDIRECT_URI } from "@/lib/services/hub.service";

const COOKIE_NAME = "hub_access_token";
const USER_COOKIE_NAME = "hub_user_info";

export async function getHubConnectionStatus(): Promise<{
  connected: boolean;
  hubUrl: string;
  email?: string;
  name?: string;
  clientIdConfigured: boolean;
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

  const hubSetup = await checkHubSetup();

  return {
    connected: !!token,
    hubUrl: hubSetup.hubUrl,
    email,
    name,
    clientIdConfigured: hubSetup.configured,
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
    `${REDIRECT_URI}?returnTo=${encodeURIComponent(returnTo)}`,
  );
  return { redirectUrl: url.toString() };
}
