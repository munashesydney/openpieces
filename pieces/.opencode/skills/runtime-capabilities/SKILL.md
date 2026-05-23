---
name: runtime-capabilities
description: What Deno provides — runtime features, package importing, and what to avoid
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
---

## What I do

Describe the Deno runtime environment available inside OpenPieces services: what packages work, how to import them, and what patterns to avoid.

## When to use me

Use this skill whenever you need to import an external package or use a Deno-specific API. Refer to me before writing an import statement to confirm the approach will work.

---

## Package Ecosystem — All of These Work

```ts
import Stripe from "npm:stripe";                        // npm packages (most work)
import { z } from "npm:zod";                            // validation
import { Hono } from "npm:hono";                        // web framework alternative
import { DB } from "https://deno.land/x/sqlite/mod.ts"; // deno.land/x registry
import { encodeBase64 } from "jsr:@std/encoding/base64";// JSR registry
import { readFileSync } from "node:fs";                 // Node.js compat layer
import path from "node:path";                           // Node.js path utilities
```

## What to Avoid (Genuinely Doesn't Work)

- **Packages requiring native binary addons** (`.node` files) — rare, but they will fail at runtime
- **Packages that assume a browser DOM** (`window`, `document`, `fetch` from browser context)
- **Build-step frameworks** (Fresh, Next.js, Vite) — you are writing a server, not a build pipeline
- **JSX/TSX** — unnecessary complexity unless you are generating static HTML strings inline

## Built-in Deno APIs

Deno's standard library is well-maintained and available. Use it for:

- **Crypto / hashing** — `crypto` global, or `jsr:@std/crypto`
- **Encoding** — `jsr:@std/encoding` (base64, hex, json, etc.)
- **HTTP utilities** — `jsr:@std/http`
- **File system** — `Deno.readTextFile`, `Deno.writeFile`, `Deno.mkdir`, `Deno.remove`
- **Environment** — `Deno.env.get()`
- **Signals** — `Deno.addSignalListener("SIGTERM", ...)`
- **Timers** — `setTimeout`, `setInterval`, `Deno.unrefTimer`

## Key Constraint

**Do not try to install Deno or any runtime.** Deno is already installed in the execution environment. Your only job is to write code — use imports directly.

---

## Non-Deno Runtimes (Podman)

If the piece needs a non-JS runtime (Python, Go, Rust, etc.) or system dependencies (ffmpeg, chromium, pandas, numpy, etc.), do NOT use Deno. Instead, use the **podman runtime**:

1. Create a `piece.json` manifest with `"runtime": "podman"`
2. Create a `Dockerfile` with the required runtime and dependencies
3. The entrypoint is your main file (e.g. `["python", "main.py"]`)

See the `podman-runtime` skill for complete instructions, including how to handle the PORT env var and /health endpoint.