---
name: file-storage
description: Manage the service directory as a self-contained application root with persistent storage
license: MIT
compatibility: opencode
metadata:
  category: infrastructure
  runtime: deno
---

## What I do

The service directory at `/pieces/<service-id>/` is a fully writable filesystem. You own it completely — create files, subdirectories, SQLite databases, saved images, cached data, and anything else the service needs to function.

## Directory structure pattern

Keep `index.ts` thin and split logic across modules:

```
/pieces/<service-id>/
├── index.ts           # Entry point (required)
├── notify.ts          # Shared helper (triggers only)
├── db.ts              # Database module
├── data/
│   └── app.db         # SQLite database
├── storage/
│   └── uploads/       # Saved files, images, etc.
├── static/            # Served static assets
└── logs/              # Auto-created by runtime
```

## Persistent storage patterns

### SQLite (structured data)

```ts
import { Database } from "npm:better-sqlite3";
// Or use deno.land/x/sqlite
const db = new Database("data/app.db");

// Create tables on startup
db.exec(`CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
)`);
```

### File I/O (images, uploads, blobs)

Always ensure directories exist before writing:

```ts
// Write
await Deno.mkdir("storage/uploads", { recursive: true });
await Deno.writeFile("storage/uploads/image.png", imageBytes);

// Read back
const bytes = await Deno.readFile("storage/uploads/image.png");

// List files
const entries = [];
for await (const entry of Deno.readDir("storage/uploads")) {
  entries.push(entry);
}
```

### JSON / config files

```ts
// Write
await Deno.writeTextFile("data/config.json", JSON.stringify(config, null, 2));

// Read
const config = JSON.parse(await Deno.readTextFile("data/config.json"));
```

## When to use me

Use this skill whenever you need to persist state between HTTP requests. Prefer local storage (SQLite, flat files, JSON) over external databases unless the user specifically requests one.

Do not write files outside the assigned `/pieces/<service-id>/` directory.