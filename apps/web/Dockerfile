# ========================================
# Base Stage
# ========================================
FROM node:22-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.27.0
WORKDIR /app

# ========================================
# Prepare Stage - Prune workspace
# ========================================
FROM base AS prepare
RUN npm install -g turbo
COPY . .
# Generate pruned workspace with pruned lockfile for target workspace
RUN turbo prune @repo/web --docker

# ========================================
# Builder Stage
# ========================================
FROM base AS builder

# First install the dependencies (as they change less often).
# Kept BEFORE the NEXT_PUBLIC_* args so changing the public URL does NOT
# invalidate (and re-download) the install layer.
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

# Build-time arguments for Next.js public environment variables.
# These get inlined into the JS bundle during build, so they live right
# before the build step (changing them only re-runs the build).
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_VERSION
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_VERSION=$NEXT_PUBLIC_API_VERSION

# Build the project
COPY --from=prepare /app/out/full/ .
RUN pnpm --filter @repo/web build

# ========================================
# Runner Stage - Minimal production image
# ========================================
FROM base AS runner
# Don't run production as root for security reasons
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/app/building-your-application/deploying#minimal-usage
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 3001
CMD node apps/web/server.js
