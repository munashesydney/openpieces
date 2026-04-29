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

Every OpenPieces service has a public URL injected as an environment variable. This skill explains its **only** legitimate uses — and the patterns you must avoid.

## The variable

```ts
const publicUrl = Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL")!;
```

It is always available and points to the externally-accessible address of your service through the proxy.

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
| Building asset paths in HTML responses | `` `${publicUrl}/style.css` `` | Use a `<base>` tag in the HTML page (see `proxy-routing` skill) |
| Writing `fetch()` URLs in client-side JavaScript | `` `${publicUrl}/api/data` `` | Use relative URLs resolved against `<base>` (see `proxy-routing` skill) |
| Setting `window.location.href` for navigation | `` `${publicUrl}/dashboard` `` | Use a relative URL like `./dashboard` (see `proxy-routing` skill) |
| Self-calling an endpoint from within the same service | `` fetch(`${publicUrl}/process`) `` | Call the function directly, or use `http://localhost:{port}` for local loopback |

**The public URL must never appear in HTML or JavaScript that runs in a browser.** Browser-side code should use the `<base>` tag approach documented in the `proxy-routing` skill.

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

When calling another OpenPieces service, use its public URL (it must be known to you via configuration or an env var):

```ts
const targetPublicUrl = Deno.env.get("TARGET_SERVICE_PUBLIC_URL")!;
const res = await fetch(`${targetPublicUrl}/api/data`, {
  headers: { "authorization": `Bearer ${internalApiKey}` },
});
```

This is a legitimate use because the HTTP request goes through the proxy to the other service.

---

## Summary

| Use case | Use public URL? |
|---|---|
| Webhook callback URL for external system | ✅ Yes |
| OAuth redirect URL | ✅ Yes |
| Server-to-server API call | ✅ Yes |
| HTML asset path (`<link>`, `<script src>`) | ❌ No — use `<base>` tag instead |
| Client-side `fetch()` in browser JS | ❌ No — use relative URLs instead |
| Internal self-call within the same service | ❌ No — call functions directly or use localhost loopback |