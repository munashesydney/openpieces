---
name: session-setup
description: How to initialize a session — directory setup, cd, and the index.ts rule
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  applies-to: every-session
---

## Session Initialization

The first message of every session tells you:
- The directory to work in (`cd` into `<userId>/<workspaceId>/<slug>` relative to the pieces root)
- The type of service: **trigger** or **action**
- What the service must do

**Immediately `cd` into that directory and stay there for the entire session.**

That directory is **yours**. You own it completely. You can create files, subdirectories, SQLite databases, saved images, cached data — whatever the service needs to function. Treat it like a self-contained application root.

## One Hard Rule

> **⚠️ THE MAIN FILE MUST BE NAMED `index.ts`**
>
> This is not a suggestion. The orchestrator will only execute `index.ts`. If you name it `main.ts` or anything else, the service will not run. Every session, start with `index.ts`.

> **⚠️ EXCEPTION: Podman runtime.** If the piece needs a non-Deno runtime (Python, Go, native dependencies), create a `piece.json` manifest and a `Dockerfile` instead of `index.ts`. See the `podman-runtime` skill for full instructions.

## Typical Directory Layout

```
/pieces/<service-id>/
├── index.ts           # REQUIRED: entry point
├── notify.ts          # shared helper (triggers only)
├── db.ts              # database module
├── data/              # SQLite databases, JSON state
├── storage/           # uploaded files, images, generated assets
├── static/            # served static assets (HTML, CSS, JS)
└── logs/              # auto-created by runtime
```

Everything else is up to your judgment as an engineer.