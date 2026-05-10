---
name: service-types
description: Distinguish between trigger services, action services, and services with a web UI
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

Define the three service patterns available in OpenPieces and when to use each one. Every session message tells you which type to build — this skill explains the shape, constraints, and patterns for each type.

## Trigger Service

Exposes an inbound endpoint that receives external events and forwards them to the Events AI.

**Characteristics:**
- Listens for webhooks, polling events, SSE streams, cron-based checks, etc.
- **Validates** inbound requests before acting (signature checks, auth headers, IP allowlists)
- Calls `notifyEventsAi` on every meaningful event
- Does minimal processing — receive, validate, forward
- Lives inside exactly one workflow

**Flow:**
```
External event → Trigger service → notifyEventsAi() → Events AI → Workflow
```

## Action Service

Exposes endpoints that perform a specific task on demand.

**Characteristics:**
- Accepts a JSON body, returns a clear JSON response
- Does NOT call `notifyEventsAi` — it responds to the caller (orchestrator or user), that's it
- Can be called from workflows, other services, or directly by the user
- Can be a standalone product (game, dashboard, tool) or workflow machinery

**Response format:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "description" }
```

## Service with a Web UI

For services that serve a browser-based interface. Each service runs at the root of its own subdomain (`https://{serviceId}.{SERVICE_DOMAIN}`), so standard absolute paths work naturally.

**Characteristics:**
- Serves HTML directly from Deno — no build step, no JSX
- Static assets (CSS, JS, images) are served from a `static/` directory
- Use standard absolute paths (`/game`, `/static/style.css`) — no tricks needed
- Include `access-control-allow-origin: "*"` on asset responses
- Handle missing files gracefully — return 404, not 500

**Pattern — serving HTML:**
```ts
if (pathname === "/play-ai") {
  const html = await Deno.readTextFile("static/play-ai.html");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
```

**Pattern — HTML page:**
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <a href="/">Home</a>
  <a href="/other-page">Other Page</a>
  <script src="/static/app.js"></script>
</body>
</html>
```

**Static asset serving:**
```ts
if (pathname.startsWith("/static/")) {
  try {
    const file = await Deno.readFile(`.${pathname}`);
    const ext = pathname.split(".").pop();
    const mimeTypes: Record<string, string> = {
      css: "text/css",
      js: "application/javascript",
      html: "text/html",
      png: "image/png",
      jpg: "image/jpeg",
      svg: "image/svg+xml",
    };
    return new Response(file, {
      headers: {
        "content-type": mimeTypes[ext ?? ""] ?? "application/octet-stream",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
```

See the `proxy-routing` skill for URL construction and WebSocket limitations. See the `server-routing` skill for route matching patterns.

## When to use me

Use this skill at the start of a session to understand which service pattern the session message is asking for. Each pattern has different requirements for endpoints, notifications, and response formats.
