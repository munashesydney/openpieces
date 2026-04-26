---
name: code-standards
description: Code quality, error handling, logging, graceful shutdown, and hard constraints for OpenPieces services
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: fundamentals
---

## What I do

Defines the non-negotiable code quality standards, error handling patterns, logging conventions, and hard constraints every OpenPieces service must follow.

---

## Error Handling

- **Every async operation in a route handler must be wrapped in try/catch** — uncaught rejections crash the service.
- **Return structured JSON errors**: `{ error: "description" }` with an appropriate HTTP status code.
- **Fail fast on missing required configuration** — throw early with a descriptive message so the problem is obvious.
- **Never expose internal error details to the client** — log them server-side, return a safe message to the user.

```ts
try {
  const result = await someOperation(input);
  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { "content-type": "application/json" },
  });
} catch (err) {
  console.error("[my-service] someOperation failed:", err);
  return new Response(
    JSON.stringify({ error: "Failed to process request" }),
    { status: 500, headers: { "content-type": "application/json" } },
  );
}
```

## Logging

- **Log meaningful events** — `console.log("[service-name] event description")`
- **Prefix log messages with a service identifier** — makes filtering logs by service easy
- **Never log secrets or full request bodies** — no API keys, tokens, or raw payloads
- **Use `console.log` for info, `console.error` for errors** — they go to separate streams
- Logs are automatically written to `pieces/<service-directory>/logs/<today>.log`

## Graceful Shutdown

For long-running services (polling loops, SSE servers, open database connections), handle SIGTERM cleanly:

```ts
Deno.addSignalListener("SIGTERM", () => {
  console.log("[service] shutting down");
  db.close();         // close SQLite connections
  await flushState(); // flush pending writes
  clearInterval(pollTimer); // stop polling loops
  Deno.exit(0);
});
```

Services that hold resources (DB connections, file handles, polling intervals) **must** implement this.

## TypeScript Discipline

- **Use TypeScript types everywhere** — define interfaces for request bodies, response shapes, and function parameters
- **Avoid `any`** — prefer `unknown` with type narrowing when you don't know the shape
- **Keep route handlers thin** — extract business logic into separate modules (`db.ts`, `service.ts`, etc.)

```ts
// Good
interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

// Bad
function handler(req: Request): Promise<Response> {
  const body: any = await req.json(); // avoid this
}
```

## When to use me

Apply this skill to every service you write. These are non-negotiable production standards — skip them and the service will be unreliable.