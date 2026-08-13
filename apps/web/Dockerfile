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

# Sentry browser configuration. Public by nature (the DSN is a write-only
# ingest key) and inlined into the client bundle, so it belongs with the other
# NEXT_PUBLIC_* args. Unset by default: the image builds and runs with crash
# reporting off. Server-side SENTRY_* values are runtime config, not build
# args, and SENTRY_AUTH_TOKEN in particular must never be baked into a layer.
# SENTRY_ENVIRONMENT is a build arg only for the browser half: it is inlined
# into the client bundle (via the projection in next.config.ts) because a client
# bundle cannot read runtime env. The server and edge runtimes still take it as
# ordinary runtime config, so passing it here does not bake in their value.
#
# An unset ARG becomes an empty ENV rather than an absent one, so a build with
# no Sentry configuration hands `apps/web/env.ts` `NEXT_PUBLIC_SENTRY_ENABLED=""`.
# That is normalized back to "unset" there — do not tighten it into a value the
# flag parser has to accept, or the unconfigured build starts failing.
ARG NEXT_PUBLIC_SENTRY_ENABLED
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ENV NEXT_PUBLIC_SENTRY_ENABLED=$NEXT_PUBLIC_SENTRY_ENABLED
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE

# Source-map upload target. Org and project slugs are plain identifiers, not
# credentials, so they travel as ordinary build args like everything else the
# bundler plugin needs. Unset by default: no org, no upload.
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

# Build the project
COPY --from=prepare /app/out/full/ .
# SENTRY_AUTH_TOKEN is a BuildKit secret, deliberately NOT an ARG/ENV. Build
# args and env vars are recorded as image metadata that `docker history` prints
# back to anyone who can pull the image, and this token is a write credential
# for the whole Sentry org. A secret mount is a tmpfs file scoped to this single
# RUN: it never becomes a layer and never appears in the image's history.
# Exporting it inside the same RUN keeps it in that one shell only.
#
# `required=false` keeps the token optional — contributor and CI builds without
# Sentry configured pass no secret, the variable stays unset, and next.config.ts
# prints its skip notice instead of failing the build.
RUN --mount=type=secret,id=sentry_auth_token,required=false \
  if [ -f /run/secrets/sentry_auth_token ]; then \
  export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
  fi; \
  pnpm --filter @repo/observability build && \
  pnpm --filter @repo/web build

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
