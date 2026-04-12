#!/bin/bash
set -e

required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB")

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ ERROR: Required environment variable '$var' is not set."
    exit 1
  fi
done

echo "✅ All required environment variables present."
exec docker-entrypoint.sh "$@"
