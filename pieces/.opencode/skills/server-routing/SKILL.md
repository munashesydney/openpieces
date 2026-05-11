---
name: server-routing
description: How to match request paths in Deno HTTP services
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

Your service runs at the root of its own subdomain (`https://{serviceId}.{SERVICE_DOMAIN}`). A request to `/game` arrives as `pathname === "/game"`. Standard path matching applies.

---

## Path matching pattern

Match longer paths before shorter ones. `/health` always comes first.

```ts
Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // Health check — always first
  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Route matching — longest paths first
  if (pathname === "/online/play") {
    return handleOnlinePlay(req);
  } else if (pathname === "/api/create-room" && method === "POST") {
    return handleCreateRoom(req);
  } else if (pathname === "/play-ai") {
    return handlePlayAi(req);
  } else if (pathname === "/online") {
    return handleOnline(req);
  } else if (pathname.startsWith("/api/")) {
    return handleApi(req);
  } else {
    // Root / fallback
    return serveHtml("index.html");
  }
});
```

---

## Route priority

When one path is a prefix of another (e.g., `/online/play` starts with `/online`), check the longer path first:

```ts
// ✅ Correct — longest first
if (pathname === "/online/play") { /* play page */ }
else if (pathname === "/online") { /* lobby */ }

// ❌ Wrong — shorter path catches everything
if (pathname === "/online") { /* catches /online/play too */ }
else if (pathname === "/online/play") { /* never reached */ }
```

---

## API vs page routes

Group API endpoints under `/api/` to keep them distinct from page routes:

| Route type | Example path | Response |
|---|---|---|
| Health | `/health` | `{ status: "ok" }` |
| Page | `/play-ai` | HTML |
| Page | `/online` | HTML |
| API | `/api/create-room` | JSON |
| API | `/api/state` | JSON |

---

## Query parameters

Parse from `url.searchParams`:

```ts
const room = url.searchParams.get("room");
const player = url.searchParams.get("player");
```
