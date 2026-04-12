#!/bin/bash
set -e

required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB")

# Placeholder values that should be rejected
dangerous_defaults=(
  "change-me-before-deploying"
  "change-me-to-a-random-secret"
  "change-me-to-a-secure-password"
  "change-me-to-a-random-internal-secret"
)

for var in "${required_vars[@]}"; do
  val="${!var}"
  if [[ -z "$val" ]]; then
    echo "❌ ERROR: Required environment variable '$var' is not set."
    exit 1
  fi
  for bad in "${dangerous_defaults[@]}"; do
    if [[ "$val" == "$bad" ]]; then
      echo "❌ ERROR: '$var' still has its default placeholder value ('$bad'). Please change it."
      exit 1
    fi
  done
done

echo "✅ All required database environment variables present and valid."
exec docker-entrypoint.sh "$@"
