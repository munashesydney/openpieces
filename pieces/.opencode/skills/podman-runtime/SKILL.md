---
name: podman-runtime
description: How to write pieces that run in Podman containers instead of Deno
license: MIT
compatibility: opencode
metadata:
  audience: opencode-agent
  category: runtime
---

## What I do

Teach you how to create pieces that need a non-Deno runtime — Python, Node.js with native dependencies, Go, Rust, FFmpeg, or anything that requires a custom container image. These pieces run inside Podman containers managed by the worker.

## When to use me

Use this skill when:
- The piece needs Python packages (pandas, numpy, ffmpeg-python, etc.)
- The piece needs native system dependencies (ffmpeg, imagemagick, chromium, etc.)
- The piece is written in a language other than TypeScript/JavaScript
- The piece needs a specific OS-level configuration
- You were told by the orchestrator to use the podman runtime

**Do NOT use this for standard Deno/TypeScript pieces** — those work without any manifest or Dockerfile.

---

## How it works

Instead of the worker running `deno run index.ts`, it:
1. Reads `piece.json` from the piece directory
2. If `"build": true`, runs `podman build` to create the image
3. Runs `podman run` to spawn the container
4. Passes a `PORT` environment variable — the container MUST listen on that port

---

## Required files

Every podman piece needs exactly two files in its root:

### 1. `piece.json`

```json
{
  "runtime": "podman",
  "build": true,
  "dockerfile": "Dockerfile",
  "image": "python:3.12-slim",
  "entrypoint": ["python", "main.py"],
  "exposePort": 8000
}
```

**Fields:**
| Field | Required | Default | Description |
|---|---|---|---|
| `runtime` | **Yes** | — | Must be `"podman"` |
| `build` | No | `false` | Whether to `podman build` before running. Use `true` when you write a custom Dockerfile. Use `false` to run a stock image directly. |
| `dockerfile` | No | `"Dockerfile"` | Path to the Dockerfile relative to the piece directory |
| `image` | **Yes** | — | Image name. When `build: true`, this is the base image used in `FROM` (the built image is tagged as `piece-<serviceId>:latest`). When `build: false`, this is pulled and run directly. |
| `entrypoint` | **Yes** | — | Command + args to execute inside the container. The `PORT` env var is injected automatically — your code should read it. |
| `exposePort` | No | `8000` | The port your process listens on inside the container. The worker maps this to a dynamic host port. Your code MUST read the `PORT` environment variable (not hardcode a port). |

### 2. `Dockerfile`

A standard Dockerfile. The piece directory is the build context.

```dockerfile
FROM python:3.12-slim
RUN pip install pandas numpy ffmpeg-python
WORKDIR /app
COPY . .
```

---

## Mandatory: /health endpoint

Every podman piece MUST serve a `/health` endpoint that returns `{"status": "ok"}` with `Content-Type: application/json`. The worker polls this endpoint to confirm the container is ready.

Example in Python:
```python
import os, json
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PORT", 8000))

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
```

---

## Environment variables

The following env vars are injected into every podman container — same as Deno pieces:

| Variable | Description |
|---|---|
| `PORT` | The port your server MUST listen on (dynamically assigned) |
| `OPENPIECES_WORKSPACE_ID` | Current workspace ID |
| `OPENPIECES_USER_ID` | Workspace owner user ID |
| `OPENPIECES_SERVICE_ID` | Current service ID |
| `OPENPIECES_WORKFLOW_ID` | Workflow ID (if linked) |
| `OPENPIECES_SERVICE_PUBLIC_URL` | Public URL for this service |
| `INTERNAL_API_KEY` | Internal API key for OpenPieces calls |

Plus any secrets the service requires (injected as env vars with their key names).

---

## Logging

- Write logs to stdout/stderr — they are captured by the worker and written to `pieces/<directory>/logs/`
- Prefix log lines with the service name for filtering: `[my-service] something happened`
- Never log secrets, tokens, or full request bodies

---

## Graceful shutdown

Handle SIGTERM for clean shutdown. Example in Python:
```python
import signal, sys

def shutdown(sig, frame):
    print("[my-service] shutting down", flush=True)
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown)
```

---

## Constraints

- **Must listen on 0.0.0.0** (not 127.0.0.1) — the port mapping forwards from the host to the container
- **Must read PORT from environment** — never hardcode the port
- **Must include /health endpoint** — same requirement as Deno services
- **Keep images small** — use `-slim` variants, clean up package caches in the Dockerfile
- **No multi-stage builds required** — keep it simple
- **The piece directory is the build context** — put all source files there, reference them with relative paths
