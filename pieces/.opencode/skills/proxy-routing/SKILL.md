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
  var base = document.createElement('base');
  base.href = p;
  document.head.appendChild(base);
})();
</script>
```

The `<base>` tag tells the browser to resolve ALL relative URLs (links, fetch, form actions, window.location) against this base.

**Always use `document.createElement('base')` + `appendChild` — never `document.write`.** `document.write` is blocked by Content-Security-Policy headers, only works during the initial HTML parse, and is deprecated in modern web standards. The `createElement` approach is robust and always works.

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
(function(){var p=location.pathname;if(!p.endsWith('/'))p+='/';var b=document.createElement('base');b.href=p;document.head.appendChild(b);})();
</script>
```

**Single-segment page** (strip one path segment):
```html
<script>
(function(){var p=location.pathname;if(p.endsWith('/route-name'))p=p.slice(0,-('/route-name'.length));if(!p.endsWith('/'))p+='/';var b=document.createElement('base');b.href=p;document.head.appendChild(b);})();
</script>
```

**Multi-segment page** (strip nested path, check longest first):
```html
<script>
(function(){var p=location.pathname;var suffixes=['/route/sub-page','/route'];for(var i=0;i<suffixes.length;i++){if(p.endsWith(suffixes[i])){p=p.substring(0,p.length-suffixes[i].length);break;}}if(!p.endsWith('/'))p+='/';var b=document.createElement('base');b.href=p;document.head.appendChild(b);})();
</script>
```

---

## Linking rules

Once `<base href="/api/s/ID/">` is set, use the `./` prefix for ALL relative URLs. The `./` prefix is safer: if the `<base>` tag is somehow missing or malformed, `./images/4` is more likely to resolve correctly than bare `images/4`.

| Target | Use this |
|---|---|
| Sub-page (e.g., online) | `<a href="./online">` |
| Another sub-page (e.g., play-ai) | `<a href="./play-ai">` |
| Back to root / lobby | `<a href="./">` |
| API endpoint | `fetch('./api/create-room', ...)` |
| Navigate to sibling | `<a href="./other-page">` |
| Image source | `<img src="./images/4">` |
| Form action | `<form action="./submit" method="POST">` |
| Static asset (CSS) | `<link rel="stylesheet" href="./static/style.css">` |
| Static asset (JS) | `<script src="./static/app.js">` |

**Key insight:** after `<base href="/api/s/ID/">` is set:
- `./online` → `/api/s/ID/online`
- `./api/create-room` → `/api/s/ID/api/create-room`
- `./` → `/api/s/ID/`
- `./images/4` → `/api/s/ID/images/4`

**What NOT to use:**
- ❌ Absolute paths starting with `/` — `/play-ai` resolves to `https://host/play-ai`, skipping the proxy prefix
- ❌ Server-injected base paths — no placeholder replacement, no env var interpolation

---

## ⚠️ Navigation & Redirects — Use JS, NOT server-side 302

**Server-side redirects (`Location` headers on 3xx responses) are inherently fragile in proxy environments** and should be avoided. `Location` headers are **not** resolved against the `<base>` tag — the browser resolves them against the raw request URL instead.

If you need to redirect after an action (e.g., form submission, login, navigation), use client-side JavaScript:

### Correct: JS fetch + client-side navigation

```js
// Submit form data via fetch, then navigate client-side
var res = await fetch('./api/submit', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ /* form data */ })
});

if (res.ok) {
  window.location.href = './dashboard';  // resolved against <base> — correct
}
```

### Correct: JS fetch + reload current page

```js
var res = await fetch('./api/action', { method: 'POST', body: formData });
if (res.ok) {
  window.location.reload();
}
```

### When you truly must use a `Location` header (rare)

If you have **no choice** but to return a 302 (e.g., external OAuth redirects), the `Location` header resolves against the **raw request URL** (not `<base>`). The browser strips the last segment before resolving, so the danger is repeating directory names already in the current path. Use just the page name:

| Current URL path | Want | Correct | Wrong |
|---|---|---|---|
| `.../route/login` | `.../route/dashboard` | `dashboard` | `./route/dashboard` duplicates `route/` ❌ |
| `.../route/dashboard` | `.../route/settings` | `settings` | `./route/settings` duplicates `route/` ❌ |
| `.../route/dashboard` | `.../` (root) | `../` | `./` stays inside `route/` ❌ |

**Think of the raw request path as a folder.** You're already in `route/` — just say `dashboard`, don't say `./route/dashboard`.

But again: **prefer JS fetch + `location.href`** instead. It's simpler, works every time, and needs no mental model of how browsers resolve `Location` headers against raw request URLs.

---

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

In HTML pages, reference them with the `./` prefix resolved against the `<base>`:

```html
<link rel="stylesheet" href="./static/style.css">
<script src="./static/app.js"></script>
<img src="./static/logo.png" alt="Logo">
```

These resolve to `/api/s/ID/static/style.css` via the `<base>` tag — no server-side injection needed.

---

## What NOT to do

- ❌ **Do NOT inject base paths at the server** — no placeholder replacement (`BASE_PATH_PLACEHOLDER`, `__BASE__`, etc.), no env var interpolation into HTML
- ❌ **Do NOT use `OPENPIECES_SERVICE_PUBLIC_URL` for client-side URL construction** — it requires server-side injection and creates a dependency on an env var. See the `public-url` skill for its proper use
- ❌ **Do NOT use WebSocket** — the proxy's `fetch()` cannot upgrade connections
- ❌ **Do NOT use absolute paths starting with `/`** — `/play-ai` resolves to `https://host/play-ai`, skipping the entire proxy prefix
- ❌ **Do NOT hardcode service IDs in URLs** — they change between environments; always rely on the `<base>` tag computed from `location.pathname`
- ❌ **Do NOT use server-side `Location` header redirects** — use JS `fetch()` + `window.location.href` instead
