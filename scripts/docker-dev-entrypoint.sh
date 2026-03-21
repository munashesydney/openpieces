#!/bin/sh
# Run at container startup to pick up any new dependencies added on the host.
# The source code is mounted at /app, so package.json is always up-to-date.
cd /app && npm install --no-audit --no-fund
exec "$@"