"use server";

/**
 * Check whether the hub API key is configured in the environment.
 * Shared by push/pull buttons to show setup instructions instead of failing.
 */
export async function checkHubSetup(): Promise<{
  configured: boolean;
  hubUrl: string;
}> {
  const rawKey = process.env.OPENPIECES_HUB_CLIENT_ID ?? "";
  const configured =
    !!rawKey &&
    rawKey.length > 10 &&
    !rawKey.includes("xxxx");

  return {
    configured,
    hubUrl: process.env.OPENPIECES_HUB_URL ?? "http://localhost:3000",
  };
}
