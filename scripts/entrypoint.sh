#!/bin/sh
set -e

# Required variables for the application
required_vars="DATABASE_URL AUTH_SECRET SECRETS_ENCRYPTION_KEY INTERNAL_API_KEY OPENCODE_SERVER_PASSWORD"

# Placeholder values that should be rejected
dangerous_defaults="change-me-before-deploying change-me-to-a-random-secret change-me-to-a-secure-password change-me-to-a-random-internal-secret"

for var in $required_vars; do
  # In posix sh, we use eval to get the value of a variable named by a string
  val=$(eval echo \"\$$var\")
  
  if [ -z "$val" ]; then
    echo "❌ ERROR: Required environment variable '$var' is not set."
    exit 1
  fi
  
  for bad in $dangerous_defaults; do
    if [ "$val" = "$bad" ]; then
      echo "❌ ERROR: '$var' still has its default placeholder value ('$bad'). Please change it."
      exit 1
    fi
  done
done

echo "✅ All required application environment variables present and valid."

# Development-specific logic: ensure node_modules are up-to-date when source is mounted
if [ "$NODE_ENV" = "development" ]; then
  echo "🛠️ Development mode detected. Checking dependencies..."
  cd /app && npm install --no-audit --no-fund
fi

# Seed .opencode plugins into the shared pieces volume if not already present.
# The plugin files are baked into /app/pieces-seed in the Docker image; the
# pieces volume mounts over /app/pieces at runtime so we must copy from the
# staging area rather than relying on the image's /app/pieces directory.
if [ -d "/app/pieces-seed/.opencode" ] && [ ! -d "/app/pieces/.opencode" ]; then
  echo "🔌 Seeding .opencode plugins into pieces volume..."
  cp -r /app/pieces-seed/.opencode /app/pieces/.opencode
  echo "✅ .opencode plugins seeded successfully"
fi

# Hand off to the intended command (CMD)
exec "$@"
