---
name: self-reference
description: How to use OPENPIECES_SERVICE_PUBLIC_URL for constructing absolute URLs, self-calling endpoints, and making API requests inside your service
license: MIT
compatibility: opencode
metadata:
  category: networking
---

## What I do

This skill explains how to reference your own service's public URL from within your Deno HTTP service. Every OpenPieces service has a public URL injected as an environment variable that must be used as the base for all URL construction.

## Public URL variable

```ts
const publicUrl = Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL")!;
```

This is always available. Use it as the base URL whenever your service needs to call itself or construct absolute URLs.

## When to use the public URL

| Situation | Do this |
|---|---|
| Providing a webhook callback URL to an external service | `` `${publicUrl}/webhook` `` |
| Building absolute asset paths in HTML responses | `` `${publicUrl}/style.css` `` |
| Self-calling an endpoint from within the service | `` `${publicUrl}/process` `` |
| Calling another endpoint you just wrote | `` `${publicUrl}/send-email` `` |
| Redirecting the client to another route | `` `${publicUrl}/dashboard` `` |

## Why relative paths break

Behind the OpenPieces proxy, relative paths like `/style.css` may resolve against an internal address rather than the public endpoint. Always build absolute URLs from `OPENPIECES_SERVICE_PUBLIC_URL`.

## Examples

```ts
// Constructing a webhook callback URL to give to an external service
const publicUrl = Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL")!;
const callbackUrl = `${publicUrl}/webhook`;

// Building absolute asset paths for HTML responses
const cssUrl = `${publicUrl}/style.css`;

// Self-calling an endpoint from within the service
const res = await fetch(`${publicUrl}/process`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
```

## Calling your own API endpoints

Whenever you implement an endpoint and need to call it from elsewhere (trigger processing, chaining, internal routing), always use the public URL:

```ts
// GOOD — resolves through the proxy
const res = await fetch(`${publicUrl}/api/process`, { ... });

// BAD — may break behind the proxy
const res = await fetch(`/api/process`, { ... });
```
