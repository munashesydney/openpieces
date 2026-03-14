# =============================================================================
# Stage 1: Base - shared alpine node setup
# =============================================================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# =============================================================================
# Stage 2: Deps - install all dependencies (cached layer)
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# =============================================================================
# Stage 3: Development - hot-reload dev server with source mounted at runtime
# =============================================================================
FROM base AS development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# =============================================================================
# Stage 4: Migrator - minimal image used to run DB migrations in production
# =============================================================================
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY lib/db/migrate.ts ./lib/db/migrate.ts
COPY lib/db/schema.ts ./lib/db/schema.ts
COPY drizzle/ ./drizzle/
COPY tsconfig.json ./tsconfig.json
CMD ["npx", "tsx", "lib/db/migrate.ts"]

# =============================================================================
# Stage 5: Builder - compile the production build
# =============================================================================
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# =============================================================================
# Stage 6: Worker - production worker image for pg-boss chat execution
# =============================================================================
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npx", "tsx", "scripts/ai-worker.ts"]

# =============================================================================
# Stage 7: Runner - lean production image using Next.js standalone output
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
