# ========================================
# Base Stage
# ========================================
FROM node:22-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat wget
RUN npm install -g pnpm@10.27.0
WORKDIR /app

# ========================================
# Prepare Stage - Prune workspace
# ========================================
FROM base AS prepare
RUN npm install -g turbo
COPY . .
# Generate pruned workspace with pruned lockfile for target workspace
RUN turbo prune @repo/backend --docker

# ========================================
# Builder Stage
# ========================================
FROM base AS builder
# First install dependencies (as they change less often)
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Resilient install: cached pnpm store (survives retries) + generous retries
# for slow/flaky networks. Cache mount requires BuildKit (default here).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm config set fetch-retries 5 && \
  pnpm config set fetch-retry-maxtimeout 120000 && \
  pnpm config set network-concurrency 8 && \
  pnpm install --frozen-lockfile
# Build all workspace packages first, then backend (skip lint/typecheck in Docker)
COPY --from=prepare /app/out/full/ .
ENV TURBO_FORCE_BUILD=1
RUN pnpm run build

# ========================================
# Runner Stage - Minimal production image
# ========================================
FROM base AS runner
# Don't run production as root for security reasons
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
# Copy package files needed for runtime
COPY --from=prepare --chown=nodejs:nodejs /app/out/json/apps/backend/package.json ./apps/backend/package.json
# Copy production dependencies (needed for runtime)
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
# Copy packages with their compiled dist folders
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1
CMD node apps/backend/dist/main.js
