---
name: environment-secrets
description: How to use environment variables and the Secrets tools for API keys and credentials
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: configuration
---

## What I do

This skill covers all environment variable usage in OpenPieces Deno services — both the built-in variables injected automatically and the secrets that users must supply.

---

## Built-in Environment Variables

These are injected automatically. Read them with `Deno.env.get()` — never create or set them.

```ts
Deno.env.get("OPENPIECES_WORKSPACE_ID")
Deno.env.get("OPENPIECES_USER_ID")
Deno.env.get("OPENPIECES_SERVICE_ID")
Deno.env.get("OPENPIECES_WORKFLOW_ID")
Deno.env.get("OPENPIECES_SERVICE_PUBLIC_URL")
Deno.env.get("INTERNAL_API_KEY")
```

Always fail fast on missing required secrets:

```ts
const apiKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!apiKey) throw new Error("Missing required secret: STRIPE_SECRET_KEY");
```

---

## Tool: Secrets Manager

Use this tool whenever your service needs a secret (API key, token, connection string, etc.) that the user must supply.

**Workflow:**
1. Call `action: "list"` — check if the secret already exists
2. If not, call `action: "create"` with an empty value — the user fills it in
3. Add a comment in code near the `Deno.env.get` call:

```ts
// Secret: STRIPE_SECRET_KEY — set this in OpenPieces → Secrets
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeKey) throw new Error("Missing required secret: STRIPE_SECRET_KEY");
```

After creating a secret, immediately call the **Required Secrets tool** to mark it as required.

---

## Tool: Required Secrets

Declares which secrets must be set before the service can start — prevents the user from accidentally launching without them.

- `action: "add"` — after creating a secret via the Secrets tool
- `action: "list"` — to see what's already required
- `action: "remove"` — if you remove a secret dependency

---

## When to use me

Every time you reference a `Deno.env.get()` for a user-supplied credential. Create the secret placeholder, mark it as required, and document it with a code comment.