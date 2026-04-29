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
- Every HTML page includes a `<base>` tag computed from `location.pathname` — no server-side URL injection
- Static assets (CSS, JS, images) are served from a `static/` directory
- Include `access-control-allow-origin: "*"` on asset responses
- Handle missing files gracefully — return 404, not 500
- Use relative paths in HTML (resolved against `<base>`), never absolute paths starting with `/`

**Pattern — serving HTML:**
```ts
if (pathname.endsWith('/play-ai')) {
  const html = await Deno.readTextFile("static/play-ai.html");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
```

**Pattern — HTML file with `<base>` tag:**
```html
<!DOCTYPE html>
<html>
<head>
<script>
(function(){
  var p = location.pathname;
  // Strip the route suffix that identifies this page
  if (p.endsWith('/play-ai')) p = p.slice(0, -('/play-ai'.length));
  if (!p.endsWith('/')) p += '/';
  document.write('<base href="' + p + '">');
})();
</script>
<link rel="stylesheet" href="static/style.css">
</head>
<body>
  <a href="./">Back to Home</a>
  <a href="other-page">Go to Other Page</a>
  <script src="static/app.js"></script>
</body>
</html>
```

**Static asset serving:**
```ts
if (pathname.startsWith('/static/')) {
  try {
    const file = await Deno.readFile(`.${pathname}`);
    const ext = pathname.split('.').pop();
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

**Key differences from the old approach:**
- ❌ No `OPENPIECES_SERVICE_PUBLIC_URL` injection into HTML
- ❌ No placeholder replacement (`./style.css` → `${publicUrl}/style.css`)
- ✅ Use `<base>` tag computed from `location.pathname` in every HTML page
- ✅ Use relative paths in HTML (`static/style.css`, `./other-page`, `other-page`)
- ✅ Static assets served from the service's own `static/` directory

See the `proxy-routing` skill for detailed guidance on `<base>` tag computation and linking rules. See the `server-routing` skill for server-side path matching patterns.

## When to use me

Use this skill at the start of a session to understand which service pattern the session message is asking for. Each pattern has different requirements for endpoints, notifications, and response formats.