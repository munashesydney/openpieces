---
name: public-url
description: When and how to use OPENPIECES_SERVICE_PUBLIC_URL — server-to-server calls and webhook callbacks only
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: networking
---

## What I do

Every OpenPieces service has a public URL injected as an environment variable. This skill explains its **only** legitimate uses.

## The variable

```ts
const publicUrl = Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL")!;
```

It is always available and points to the externally-accessible address of your service.

---

## When to use the public URL

| Situation | Do this |
|---|---|
| Providing a webhook callback URL to an external system | `` `${publicUrl}/stripe-webhook` `` |
| Giving an external API a URL to call you back at | `` `${publicUrl}/oauth-callback` `` |
| Constructing a link another service needs to call yours | `` `${publicUrl}/api/resource` `` |

These are **server-to-server** scenarios — the consuming code runs on another machine, not in a browser.

## When NOT to use the public URL

| Situation | Don't do this | Instead |
|---|---|---|
| Building asset paths in HTML responses | `` `${publicUrl}/style.css` `` | Use a normal absolute path like `/style.css` |
| Writing `fetch()` URLs in client-side JavaScript | `` `${publicUrl}/api/data` `` | Use a normal absolute path like `/api/data` |
| Setting `window.location.href` for navigation | `` `${publicUrl}/dashboard` `` | Use a normal absolute path like `/dashboard` |
| Self-calling an endpoint from within the same service | `` fetch(`${publicUrl}/process`) `` | Call the function directly, or use `http://localhost:{port}` for local loopback |

**The public URL must never appear in HTML or JavaScript that runs in a browser.** Browser-side code should use standard absolute paths — the service is at the root of its own origin.

---

## Server-side self-calling (within the same service)

If you need to call one of your own endpoints from within the same process:

### Preferred: direct function call

Extract the logic into a shared function and call it directly — no HTTP round-trip:

```ts
// shared.ts
export async function processData(payload: ProcessPayload): Promise<ProcessResult> {
  // actual logic
}

// route handler calls it directly
const result = await processData(payload);

// another internal caller also calls it directly
const result = await processData(payload);
```

### Acceptable: localhost loopback

If you must go through HTTP, use the local port, not the public URL:

```ts
const port = Deno.args[0];
const res = await fetch(`http://localhost:${port}/process`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
```

### Wrong: public URL self-call

```ts
// BAD — goes out to the internet and back through the proxy
const publicUrl = Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL")!;
const res = await fetch(`${publicUrl}/process`, { ... });
```

---

## Server-to-server calls to OTHER services

When calling another OpenPieces service, use its public URL:

```ts
const targetPublicUrl = Deno.env.get("TARGET_SERVICE_PUBLIC_URL")!;
const res = await fetch(`${targetPublicUrl}/api/data`, {
  headers: { "authorization": `Bearer ${internalApiKey}` },
});
```

---

## Summary

| Use case | Use public URL? |
|---|---|
| Webhook callback URL for external system | ✅ Yes |
| OAuth redirect URL | ✅ Yes |
| Server-to-server API call | ✅ Yes |
| HTML asset path (`<link>`, `<script src>`) | ❌ No — use normal absolute paths |
| Client-side `fetch()` in browser JS | ❌ No — use normal absolute paths |
| Internal self-call within the same service | ❌ No — call functions directly or use localhost loopback |
