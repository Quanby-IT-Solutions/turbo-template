---
name: docker-deployment
description: Docker containerization and deployment patterns for this Turborepo monorepo. Use when writing Dockerfiles, configuring docker-compose, optimizing images, or preparing production builds. Triggers on tasks involving containers, multi-stage builds, turbo prune, image optimization, or local orchestration.
frameworks:
  - docker
  - turborepo
languages:
  - dockerfile
  - yaml
category: deployment
updated: 2025-07-12
---

# Docker Deployment Patterns

## Quick Reference

| App | Dockerfile | Port | Health Check |
|-----|-----------|------|-------------|
| Web (Next.js) | `apps/web/Dockerfile` | 3001 | `wget http://localhost:3001/` |
| Backend (NestJS) | `apps/backend/Dockerfile` | 3000 | `wget http://localhost:3000/api/v1/health` |
| Root | `Dockerfile` | — | Generic builder for all packages |

## Monorepo Docker Strategy

This project uses **Turborepo's `turbo prune`** to create minimal Docker contexts per app, reducing build time and image size.

### Web Dockerfile Pattern (Next.js Standalone)

```dockerfile
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Stage 1: Prune monorepo for web app only
FROM base AS prepare
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @repo/web --docker

# Stage 2: Install dependencies + build
FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .

# Build args for Next.js public env vars (baked at build time)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_VERSION
RUN pnpm --filter @repo/web build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3001
ENV PORT=3001 HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
```

**Key patterns:**
- `turbo prune @repo/web --docker` creates isolated workspace with only web's dependencies
- `--docker` flag splits output into `out/json/` (package.json files) and `out/full/` (source)
- Two-step copy: install deps from json first (cacheable), then copy source
- Next.js `output: "standalone"` in `next.config.ts` enables minimal Node.js server
- `NEXT_PUBLIC_*` vars are build args (not runtime env) — they're inlined during build

### Backend Dockerfile Pattern (NestJS)

```dockerfile
FROM node:22-alpine AS base
RUN apk add --no-cache wget
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Stage 1: Prune for backend
FROM base AS prepare
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @repo/backend --docker

# Stage 2: Build
FROM base AS builder
WORKDIR /app
ENV TURBO_FORCE_BUILD=1
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
```

**Key patterns:**
- `wget` added for health check (alpine doesn't include curl)
- `TURBO_FORCE_BUILD=1` ensures fresh build inside Docker
- Backend uses runtime env vars (not build args) — configured via docker-compose or ECS
- `packages/` directory copied for workspace package resolution
- Built-in HEALTHCHECK for container orchestrators

## Docker Compose (Local Production Testing)

```yaml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_APP_URL: http://localhost:3001
        NEXT_PUBLIC_API_BASE_URL: http://localhost:3000/api
        NEXT_PUBLIC_API_VERSION: v1
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - CORS_ORIGINS=${CORS_ORIGINS}
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_TRUSTED_ORIGINS=${BETTER_AUTH_TRUSTED_ORIGINS}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Key patterns:**
- Web depends on backend with `service_healthy` condition
- Backend env vars from `.env` file (not hardcoded)
- Shared bridge network for service-to-service communication
- Web build args for Next.js public variables

## Common Commands

```bash
# Build and run locally
docker compose up --build

# Build specific service
docker compose build web
docker compose build backend

# Run with specific env file
docker compose --env-file .env.production up

# View logs
docker compose logs -f web
docker compose logs -f backend

# Clean up
docker compose down --volumes --rmi all
```

## Image Optimization Rules

1. **Always use `node:22-alpine`** — ~180MB vs ~1GB for full node image
2. **Multi-stage builds** — Builder stage has dev deps, runner has only production artifacts
3. **Non-root user** — Create and switch to `nodejs` or `nextjs` user (uid 1001)
4. **Layer caching** — Copy `package.json` files first, install deps, then copy source
5. **`turbo prune --docker`** — Isolate workspace packages to minimize Docker context
6. **`.dockerignore`** — Exclude `node_modules`, `.next`, `dist`, `.git`, test files
7. **Frozen lockfile** — `pnpm install --frozen-lockfile` for reproducible builds

## Build Args vs Runtime Env

| Variable Type | When Set | Example |
|--------------|----------|---------|
| Build args (`ARG`) | Docker build time | `NEXT_PUBLIC_*` vars (inlined in JS bundle) |
| Runtime env (`ENV`) | Container start | `DATABASE_URL`, `BETTER_AUTH_SECRET` |

**Rule:** Next.js `NEXT_PUBLIC_*` variables MUST be build args. Backend variables are runtime env.

## Health Check Patterns

```dockerfile
# Backend: wget-based (alpine-compatible)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Web: wget-based
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1
```

- `--start-period=40s` gives app time to boot before checking
- `--retries=3` allows transient failures
- ECS and docker-compose both respect HEALTHCHECK directives
