---
name: service-boilerplate
description: Standard HTTP server template for OpenPieces Deno services
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

Provides the canonical HTTP server boilerplate for all OpenPieces services. Every service starts from this template.

## The boilerplate

```ts
const port = parseInt(Deno.args[0]);

if (!port) throw new Error("Port must be passed as first argument");

Deno.serve({ port }, async (req) => {
  const pathname = new URL(req.url).pathname;

  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
});
```

## Rules

- **Read port from `Deno.args[0]` by default**, but **always follow the user's explicit spec if they ask for something different** (e.g. `Deno.env.get("PORT")` or a fallback like `parseInt(Deno.args[0]) ?? 8000`). Multiple services run concurrently and each needs a unique port, so `Deno.args[0]` is the standard — but the user's requirement takes precedence.
- **Include `/health`** — mandatory for all services. Returns `{ status: "ok" }` with JSON content-type.
- **Wrap every async route handler in try/catch** — uncaught rejections crash the service.
- **Return structured JSON errors** — `{ error: "description" }` with appropriate HTTP status codes.
- **Split logic across files/modules** — keep `index.ts` thin. Extract route handlers, database logic, and helpers into separate modules.
- **Use TypeScript types everywhere** — avoid `any`. Define interfaces for request/response shapes.
- **The main entry file must be named `index.ts`** — the orchestrator only launches `index.ts`. Naming it anything else means the service will not run.

## When to use me

Every time you start a new service session. Begin with this boilerplate in `index.ts`, then add route handlers.