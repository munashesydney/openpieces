---
name: proxy-routing
description: How the OpenPieces proxy works and how to construct correct URLs in HTML and client-side JavaScript
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

OpenPieces services run behind a Next.js proxy that mounts them at `/api/s/{service_id}`. Requests arrive with pathnames like `/api/s/f0f207b0/online` — never bare `/online`. This skill explains how to construct URLs that work through the proxy in HTML pages and browser-side JavaScript.

For server-to-server URL construction, see the `public-url` skill. For server-side routing logic, see the `server-routing` skill.

---

## The proxy model

The proxy at `openpieces/app/api/s/[serviceId]/[...path]/route.ts` forwards requests like:

```
https://host/api/s/{service_id}/online       →  http://localhost:{port}/online
https://host/api/s/{service_id}/ws           →  http://localhost:{port}/ws
https://host/api/s/{service_id}/api/state    →  http://localhost:{port}/api/state
```

The proxy uses `fetch()` internally, meaning **WebSocket upgrades do not work**. See the WebSocket section below for the workaround.

---

## Golden rule: use `<base>` in every HTML page

Never inject base paths at the server (no placeholder replacement, no env var interpolation into HTML). Instead, let each HTML page compute its own base URL from `location.pathname`.

Insert this at the top of `<head>` in every page:

```html
<head>
<script>
(function(){
  var p = location.pathname;
  // Find and strip the route suffix that identifies this page
  var suffixes = ['/online/play', '/online', '/play-ai'];
  for (var i = 0; i < suffixes.length; i++) {
    if (p.endsWith(suffixes[i])) {
      p = p.substring(0, p.length - suffixes[i].length);
      break;
    }
  }
  if (!p.endsWith('/')) p += '/';
  document.write('<base href="' + p + '">');
})();
</script>
```

The `<base>` tag tells the browser to resolve ALL relative URLs (links, fetch, form actions, window.location) against this base.

### Generic base computation pattern

The pattern is always: take `location.pathname`, strip the page-specific suffix, ensure it ends with `/`.

| Page path | Suffixes to try | What to strip | Resulting base |
|---|---|---|---|
| `/api/s/ID/` | (none) | nothing | `/api/s/ID/` |
| `/api/s/ID/play-ai` | `/play-ai` | `/play-ai` | `/api/s/ID/` |
| `/api/s/ID/online` | `/online` | `/online` | `/api/s/ID/` |
| `/api/s/ID/online/play` | `/online/play`, `/online` | `/online/play` | `/api/s/ID/` |
| `/api/s/ID/game` | `/game` | `/game` | `/api/s/ID/` |
| `/api/s/ID/dashboard/settings` | `/dashboard/settings`, `/dashboard` | `/dashboard/settings` | `/api/s/ID/` |

**Check longest matching suffixes first** to avoid partial matches (e.g., match `/online/play` before `/online`).

### Per-page variants

**Root page** (no suffix to strip):
```html
<script>
(function(){var p=location.pathname;if(!p.endsWith('/'))p+='/';document.write('<base href="'+p+'">')})();
</script>
```

**Single-segment page** (strip one path segment):
```html
<script>
(function(){var p=location.pathname;if(p.endsWith('/route-name'))p=p.slice(0,-('/route-name'.length));if(!p.endsWith('/'))p+='/';document.write('<base href="'+p+'">')})();
</script>
```

**Multi-segment page** (strip nested path, check longest first):
```html
<script>
(function(){var p=location.pathname;var suffixes=['/route/sub-page','/route'];for(var i=0;i<suffixes.length;i++){if(p.endsWith(suffixes[i])){p=p.substring(0,p.length-suffixes[i].length);break;}}if(!p.endsWith('/'))p+='/';document.write('<base href="'+p+'">')})();
</script>
```

---

## Linking rules

Once `<base href="/api/s/ID/">` is set, use only **bare names** or `./` in `<a href>`, `fetch()`, and `window.location.href`:

| Target | Use this |
|---|---|
| Sub-page (e.g., online) | `<a href="online">` or `<a href="./online">` |
| Another sub-page (e.g., play-ai) | `<a href="play-ai">` |
| Back to root / lobby | `<a href="./">` |
| API endpoint | `fetch('./api/create-room', ...)` |
| Redirect to sub-page | `window.location.href = 'online/play?room=' + code` |
| Navigate to sibling | `<a href="other-page">` |

**Key insight:** after `<base href="/api/s/ID/">` is set:
- `online` → `/api/s/ID/online`
- `./online` → `/api/s/ID/online`
- `./api/create-room` → `/api/s/ID/api/create-room`
- `./` → `/api/s/ID/`

**What NOT to use:**
- ❌ Absolute paths starting with `/` — `/play-ai` resolves to `https://host/play-ai`, skipping the proxy prefix
- ❌ Server-injected base paths — no placeholder replacement, no env var interpolation

---

## Redirect `Location` headers (⚠️ not resolved against `<base>`)

`<base>` tags affect `<a href>`, `<form action>`, `fetch()`, and `window.location` — but **NOT** HTTP `Location` headers from a server redirect (3xx response).

When your service returns a 302 with `Location: ./route/page`, the browser resolves it against the **current request URL**, not the `<base>` tag. If `route` is already part of the current path, it gets duplicated:

| Request URL | `Location` header | Browser resolves to | Why? |
|---|---|---|---|
| `/api/s/ID/route/login` | `./route/dashboard` | `/api/s/ID/route/route/dashboard` | ❌ `./route/` appends another `route/` |
| `/api/s/ID/route/login` | `dashboard` | `/api/s/ID/route/dashboard` | ✅ just the page name |
| `/api/s/ID/route/dashboard` | `./route/login` | `/api/s/ID/route/route/login` | ❌ same duplication |
| `/api/s/ID/route/dashboard` | `login` | `/api/s/ID/route/login` | ✅ |
| `/api/s/ID/route/dashboard` | `./` | `/api/s/ID/route/` | ❌ stays inside `route/` |
| `/api/s/ID/route/dashboard` | `../` | `/api/s/ID/` | ✅ one level up, back to root |

### Rule of thumb

In a `Location` header, **use only the page/resource name, not `./parent/` prefix**. If the target is at the same level as the current page, just name it directly.

| If current page is | And you want to redirect to | Use | Not |
|---|---|---|---|
| `.../route/login` | `.../route/dashboard` | `dashboard` | `./route/dashboard` |
| `.../route/dashboard` | `.../route/settings` | `settings` | `./route/settings` |
| `.../route/dashboard` | `.../` (root) | `../` | `./` |
| `.../sub/dashboard` | `.../route/home` | `../route/home` | `./sub/../route/home` |

**Think of it like files in a folder:** if you're in `/route/` and want `/route/dashboard`, just say `dashboard` — not `./route/dashboard` which repeats the folder name.

## WebSocket limitation

The Next.js proxy uses `fetch()` internally, which **cannot perform a WebSocket handshake**. `Deno.upgradeWebSocket(req)` will fail behind the proxy.

### Solution: HTTP short polling

Use HTTP polling instead of WebSocket for real-time features:

```js
// On page load — join the room/resource
var res = await fetch('./api/join?room=' + roomCode, { method: 'POST' });
var data = await res.json();
var myPlayer = data.youAre;

// Poll every 1 second for state
setInterval(async function() {
  var res = await fetch('./api/state?room=' + roomCode);
  var data = await res.json();
  if (data.ready) { /* state changed, update UI */ }
}, 1000);

// Send actions via POST
await fetch('./api/move', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ room: roomCode, player: myPlayer, action: actionData })
});
```

### Standard API endpoints for polling-based real-time features

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/join` | Join/subscribe to a resource, returns current state |
| `GET` | `/api/state` | Current state snapshot (polled frequently) |
| `POST` | `/api/action` | Perform an action / send input |
| `POST` | `/api/reset` | Reset/reinitialize state |

---

## Static asset serving

Static assets (CSS, JS, images) should be served from the service itself, not from external CDNs (which may be blocked in restricted networks). Place assets in a `static/` directory and serve them with proper Content-Type headers via the `${publicUrl}/static/...` path.

However, in HTML pages, reference them with relative paths resolved against the `<base>`:

```html
<link rel="stylesheet" href="static/style.css">
<script src="static/app.js"></script>
```

These resolve to `/api/s/ID/static/style.css` via the `<base>` tag — no server-side injection needed.

---

## What NOT to do

- ❌ **Do NOT inject base paths at the server** — no placeholder replacement (`BASE_PATH_PLACEHOLDER`, `__BASE__`, etc.), no env var interpolation into HTML
- ❌ **Do NOT use `OPENPIECES_SERVICE_PUBLIC_URL` for client-side URL construction** — it requires server-side injection and creates a dependency on an env var. See the `public-url` skill for its proper use
- ❌ **Do NOT use WebSocket** — the proxy's `fetch()` cannot upgrade connections
- ❌ **Do NOT use absolute paths starting with `/`** — `/play-ai` resolves to `https://host/play-ai`, skipping the entire proxy prefix
- ❌ **Do NOT hardcode service IDs in URLs** — they change between environments; always rely on the `<base>` tag computed from `location.pathname`
