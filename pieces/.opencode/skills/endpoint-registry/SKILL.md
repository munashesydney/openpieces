---
name: endpoint-registry
description: Register every HTTP endpoint (except /health) with JSON Schema so the orchestrator discovers what your service can do
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  required: true
---

## What I do

Every HTTP endpoint you implement (except `/health`) must be registered via the Endpoint Registry tool. The orchestrator depends on this registry to discover what your service can do. Without it, endpoints are invisible to the system.

## Registration workflow

1. **Write the route handler** in your service code
2. **Call `action: "list"`** — check for duplicates first
3. **Call `action: "create"`** with `method`, `path`, `description`, and `inputSchema`

## inputSchema format

`inputSchema` is a JSON Schema (Draft-07) describing:
- **POST/PUT/PATCH** — the request body shape
- **GET** — the query parameters shape

Do not include path parameters — they are extracted automatically.

## Example

```
action: "create"
method: "POST"
path: "/send-email"
description: "Sends a transactional email via Resend"
inputSchema: {
  "type": "object",
  "properties": {
    "to":      { "type": "string", "description": "Recipient email address" },
    "subject": { "type": "string", "description": "Email subject line" },
    "body":    { "type": "string", "description": "Plain text email body" }
  },
  "required": ["to", "subject", "body"]
}
```

## Rules

- **Always register after writing the handler** — never skip this step
- **Always check for duplicates before creating** — use `action: "list"` first
- **Do NOT register `/health`** — it is automatically handled
- **Descriptions should be concise but clear** — the orchestrator reads these to understand what the endpoint does
- **Use proper JSON Schema types**: `string`, `number`, `integer`, `boolean`, `array`, `object`
- **Mark required fields** in the `required` array

## When to use me

Every time you add a new route handler to a service. Register first, then move on. If you refactor or rename an endpoint, update or delete its registry entry.