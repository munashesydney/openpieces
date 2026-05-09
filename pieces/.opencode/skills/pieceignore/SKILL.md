---
name: pieceignore
description: Controls which files get pushed to the hub via .pieceignore (gitignore-style)
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: configuration
---

## What I do

`.pieceignore` lives in the root of every piece directory and controls exactly which files are included when the user pushes the piece to the hub. It works identically to `.gitignore`.

Every piece is born with a sensible default `.pieceignore`. The AI can edit it freely to add or remove patterns as the piece evolves.

## Where it lives

```
pieces/{userId}/{workspaceId}/{slug}/.pieceignore
```

The file is created automatically when the service is first set up. It also gets seeded after a hub pull if the incoming zip didn't include one.

## Default patterns

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/
.next/

# Logs
logs/
*.log

# Environment
.env
.env.local
.env.*.local

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Data files (large binaries)
data/
*.db
*.sqlite
*.sqlite3

# Test files
__tests__/
*.test.ts
*.test.js
*.spec.ts
*.spec.js

# Git
.git/
.gitignore
.pieceignore
```

## Syntax reference

| Pattern | Meaning |
|---|---|
| `# comment` | Ignored line |
| *(blank)* | Ignored line |
| `*.log` | Match any `.log` file at any depth |
| `data/` | Match the `data` directory and everything inside it |
| `/dist` | Match `dist` only at the piece root |
| `logs/` | Match `logs` directory at any depth |
| `!important.log` | **Negation** — re-include a file that was excluded |
| `**/backup/**` | Match `backup` directory anywhere |

Rules are evaluated top-to-bottom. The **last matching rule wins**, so place negations (`!`) after the broader pattern they override.

## When to edit me

**Add patterns** when the piece generates or acquires files that shouldn't be pushed:
- Large binary assets (images, databases, models) — the hub rejects zips over ~10MB via Vercel's 4.5MB limit, but presigned URLs handle up to 50MB. Still, keep zips lean.
- Generated code or build artifacts
- Downloaded dependencies
- Test fixtures with large data
- Cache directories

**Remove or negate patterns** when a previously ignored file becomes essential:
- A `.config` directory that must ship with the piece
- A `.db` file that's actually a small lookup table (negate it specifically: `!lookup.db`)

## Rules

- **Never delete `.pieceignore`** — if it's missing, the default patterns still apply. Editing is fine, removing entirely is not.
- **Prefer specific patterns** over broad ones. `data/images.db` is better than `*.db` if only that one file is large.
- **Use negations sparingly** — they're for one-off exceptions, not for reversing entire sections.
- **Don't ignore `index.ts`** — the entry point must always be pushable.
- **After editing `.pieceignore`**, remind the user they can push to the hub to verify the zip includes what they expect.
