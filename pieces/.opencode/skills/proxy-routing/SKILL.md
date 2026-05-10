---
name: proxy-routing
description: URL construction and WebSocket limitation for OpenPieces services
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

OpenPieces services each get their own subdomain origin:

```
https://{serviceId}.{SERVICE_DOMAIN}
```

A service is the root of its own origin. A link to `/game` resolves naturally to `https://{serviceId}.example.com/game`. No special URL construction needed.

---

## How to write URLs

Use standard absolute paths. Everything just works:

| HTML / JS | Resolves to |
|---|---|
| `<a href="/game">` | `https://{id}.example.com/game` |
| `<img src="/static/logo.png">` | `https://{id}.example.com/static/logo.png` |
| `fetch('/api/state')` | `https://{id}.example.com/api/state` |
| `<form action="/submit">` | `https://{id}.example.com/submit` |
| `window.location.href = '/dashboard'` | `https://{id}.example.com/dashboard` |

```ts
// Server-side redirects work normally
return new Response(null, {
  status: 302,
  headers: { Location: "/dashboard" },
});
```

---

## WebSocket limitation

The proxy uses `fetch()` internally, which cannot perform a WebSocket handshake. `Deno.upgradeWebSocket(req)` will fail.

Use HTTP short polling instead:

```js
var res = await fetch('/api/join?room=' + roomCode, { method: 'POST' });
var data = await res.json();

setInterval(async function() {
  var res = await fetch('/api/state?room=' + roomCode);
  var data = await res.json();
  if (data.ready) { /* update UI */ }
}, 1000);

await fetch('/api/move', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ room: roomCode, action: actionData })
});
```

---

## Static assets

Serve assets from a `static/` directory. Reference with absolute paths:

```html
<link rel="stylesheet" href="/static/style.css">
<script src="/static/app.js"></script>
```

---

## What NOT to do

- ❌ WebSocket — `fetch()` cannot upgrade connections
- ❌ Hardcoding service IDs in URLs — use `OPENPIECES_SERVICE_PUBLIC_URL` for server-to-server calls
