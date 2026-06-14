import { NextResponse } from "next/server";

export async function GET() {
  const creator = "deepseek";
  const modelName = "deepseek-v4-pro";

  try {
    const response = await fetch(
      `https://ai-gateway.vercel.sh/v1/models/${creator}/${modelName}/endpoints`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        },
      },
    );

    const json = await response.json();

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      data: json,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
