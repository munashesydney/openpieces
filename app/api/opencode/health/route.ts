import { NextResponse } from "next/server";

const OPENCODE_INTERNAL_URL =
  process.env.OPENCODE_INTERNAL_URL || "http://opencode:4096";
const OPENCODE_USERNAME =
  process.env.OPENCODE_SERVER_USERNAME || "opencode";
const OPENCODE_PASSWORD =
  process.env.OPENCODE_SERVER_PASSWORD || "";

export async function GET() {
  try {
    const credentials = Buffer.from(
      `${OPENCODE_USERNAME}:${OPENCODE_PASSWORD}`,
    ).toString("base64");

    const response = await fetch(`${OPENCODE_INTERNAL_URL}/global/health`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        healthy: false,
        error: `OpenCode returned status ${response.status}`,
      });
    }

    const data = await response.json();
    return NextResponse.json({ healthy: data.healthy === true });
  } catch (error: any) {
    return NextResponse.json({
      healthy: false,
      error: error?.message || "Connection to OpenCode failed",
    });
  }
}
