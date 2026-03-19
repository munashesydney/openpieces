const port = parseInt(Deno.args[0] ?? "8001");

const JSON_HEADERS = { "content-type": "application/json" };

async function callInternalChat(): Promise<Response> {
  const workspaceId = Deno.env.get("OPENPIECES_WORKSPACE_ID");
  const userId = Deno.env.get("OPENPIECES_USER_ID");
  const internalApiKey = Deno.env.get("INTERNAL_API_KEY");

  if (!workspaceId || !userId) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "OPENPIECES_WORKSPACE_ID or OPENPIECES_USER_ID not set in env",
      }),
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  if (!internalApiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "INTERNAL_API_KEY not set in env",
      }),
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  try {
    const body = {
      workspaceId,
      userId,
      chatId: null,
      content: "Hi there from a deno process!",
    };

    const res = await fetch("http://app:3000/api/internal/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": internalApiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        body: text,
      }),
      { headers: JSON_HEADERS, status: res.ok ? 200 : 502 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { headers: JSON_HEADERS, status: 500 },
    );
  }
}

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: JSON_HEADERS,
    });
  }

  if (pathname === "/healthtest") {
    try {
      const res = await fetch("http://app:3000/api/health");
      if (!res.ok) {
        return new Response(
          JSON.stringify({ ok: false, status: res.status }),
          { headers: JSON_HEADERS, status: 502 },
        );
      }

      const data = await res.json();

      return new Response(JSON.stringify({ ok: true, data }), {
        headers: JSON_HEADERS,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: (err as Error).message }),
        { headers: JSON_HEADERS, status: 500 },
      );
    }
  }

  if (pathname === "/internal-chat-test") {
    return callInternalChat();
  }

  if (pathname === "/add") {
    const a = parseFloat(url.searchParams.get("a") || "0");
    const b = parseFloat(url.searchParams.get("b") || "0");
    const result = a + b;
    
    return new Response(JSON.stringify({ result }), {
      headers: { "content-type": "application/json" },
    });
  }

  if (pathname === "/subtract") {
    const a = parseFloat(url.searchParams.get("a") || "0");
    const b = parseFloat(url.searchParams.get("b") || "0");
    const result = a - b;
    
    return new Response(JSON.stringify({ result }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
});