---
name: proxy-routing
description: URL construction and WebSocket support for OpenPieces services
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

## WebSocket support

WebSocket works normally behind the proxy — both inbound (server-side upgrade) and outbound (client-side connect).

Each service has its own subdomain origin, so standard WebSocket handshakes resolve correctly without any special configuration.

---

## Static assets

Serve assets from a `static/` directory. Reference with absolute paths:

```html
<link rel="stylesheet" href="/static/style.css">
<script src="/static/app.js"></script>
```

---

## What NOT to do

- ❌ Hardcoding service IDs in URLs — use `OPENPIECES_SERVICE_PUBLIC_URL` for server-to-server calls
