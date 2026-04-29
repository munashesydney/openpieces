---
name: server-routing
description: How to match request paths on the server when running behind the proxy — use endsWith, not exact equality
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

When the Next.js proxy forwards a request to your service, the `req.url` pathname is the path *after* the proxy stripped its prefix. However, to keep routing robust and to avoid hardcoding assumptions, match routes using `endsWith` instead of exact equality (`===`).

This skill covers server-side routing patterns, path matching order, and URL parsing.

---

## The routing problem

The proxy strips the `/api/s/{service_id}` prefix before forwarding:

```
External:  https://host/api/s/f0f207b0/online/play
Internal:  http://localhost:{port}/online/play       ← req.url pathname
```

Your service receives `pathname === "/online/play"`. You could match with `===`, but `endsWith` is safer because:

1. It works even if the internal path has an unexpected prefix
2. It makes the intent clearer — "does this request target the `/online/play` handler?"
3. It naturally handles the case where the root path (`/`) is the target

---

## Path matching pattern

```ts
const pathname = new URL(req.url).pathname;

if (pathname.endsWith('/online/play')) {
  // serve online play HTML
} else if (pathname.endsWith('/api/create-room') && method === 'POST') {
  // create room
} else if (pathname.endsWith('/play-ai')) {
  // serve play-ai HTML
} else if (pathname.endsWith('/online')) {
  // serve online lobby HTML
} else {
  // serve root / lobby (fallback)
}
```

### Why this works

| External URL | Proxy forwards to | `pathname` your service sees | Match |
|---|---|---|---|
| `/api/s/ID/` | `/` | `/` | falls through to root handler |
| `/api/s/ID/play-ai` | `/play-ai` | `/play-ai` | `endsWith('/play-ai')` |
| `/api/s/ID/online` | `/online` | `/online` | `endsWith('/online')` |
| `/api/s/ID/online/play` | `/online/play` | `/online/play` | `endsWith('/online/play')` |
| `/api/s/ID/api/create-room` | `/api/create-room` | `/api/create-room` | `endsWith('/api/create-room')` |

---

## Route priority: longest path first

When one path is a prefix of another (e.g., `/online/play` contains `/online`), check the **longest path first**:

```ts
// ✅ CORRECT — longest paths first
if (pathname.endsWith('/online/play'))   { /* play page */ }
else if (pathname.endsWith('/online'))   { /* lobby page */ }
else if (pathname.endsWith('/play-ai'))  { /* AI play page */ }
else                                    { /* root / fallback */ }

// ❌ WRONG — `/online` matches before `/online/play`
if (pathname.endsWith('/online'))        { /* lobby — catches /online/play too! */ }
else if (pathname.endsWith('/online/play')) { /* never reached */ }
```

### General rule

Order your route checks from most specific (longest path) to least specific (shortest path). The root fallback (`else`) always comes last.

---

## Root path matching

The root path `/` requires special handling because `"/".endsWith("/")` is always true — it would match any route if placed early:

```ts
if (pathname.endsWith('/play-ai'))  { /* ... */ }
else if (pathname.endsWith('/online')) { /* ... */ }
else {
  // This is the root handler — catches `/` and any unknown path
  // serve the main page
}
```

---

## URL parsing utilities

Extract pathname and method upfront for clean routing:

```ts
Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // /health is always first
  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Route matching — longest paths first
  if (pathname.endsWith('/online/play')) {
    return handleOnlinePlay(req);
  } else if (pathname.endsWith('/api/create-room') && method === "POST") {
    return handleCreateRoom(req);
  } else if (pathname.endsWith('/play-ai')) {
    return handlePlayAi(req);
  } else if (pathname.endsWith('/online')) {
    return handleOnline(req);
  } else {
    return handleRoot(req);
  }
});
```

---

## API vs page routes

Keep API endpoints and page-serving routes in the same routing chain:

| Route type | Example path | Match | Response |
|---|---|---|---|
| Health | `/health` | `=== "/health"` | `{ status: "ok" }` |
| Page | `/play-ai` | `endsWith('/play-ai')` | HTML |
| Page | `/online/play` | `endsWith('/online/play')` | HTML |
| Page | `/online` | `endsWith('/online')` | HTML |
| API | `/api/create-room` | `endsWith('/api/create-room')` | JSON |
| API | `/api/state` | `endsWith('/api/state')` | JSON |
| API | `/api/move` | `endsWith('/api/move')` | JSON |

Group API endpoints under `/api/` to keep them distinct from page routes.

---

## Query parameters

Query parameters are preserved through the proxy. Parse them from `url.searchParams`:

```ts
const room = url.searchParams.get("room");
const player = url.searchParams.get("player");
```

---

## When to use me

Use this skill whenever you write route handlers in your service's `index.ts`. Follow the `endsWith` pattern and priority ordering outlined here, and you won't have routing bugs behind the proxy.

For client-side URL construction (HTML `<base>` tags, linking rules), see the `proxy-routing` skill. For server-to-server URL construction, see the `public-url` skill.