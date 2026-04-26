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

For services that serve a browser-based interface.

**Characteristics:**
- Serves HTML directly from Deno — no build step, no JSX
- All asset paths use `OPENPIECES_SERVICE_PUBLIC_URL`
- Static assets (CSS, JS, images) are served from a `static/` directory
- Include `access-control-allow-origin: "*"` on asset responses
- Handle missing files gracefully — return 404, not 500

**Pattern:**
```ts
if (pathname === "/") {
  const publicUrl = Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL") ?? "";
  let html = await Deno.readTextFile("static/index.html");
  html = html
    .replace("./style.css", `${publicUrl}/style.css`)
    .replace("./app.js", `${publicUrl}/app.js`);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}
```

## When to use me

Use this skill at the start of a session to understand which service pattern the session message is asking for. Each pattern has different requirements for endpoints, notifications, and response formats.