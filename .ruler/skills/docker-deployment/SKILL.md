---
name: docker-deployment
description: Docker containerization and deployment patterns for this Turborepo monorepo. Use when writing Dockerfiles, configuring docker-compose, optimizing images, or preparing production builds. Triggers on tasks involving containers, multi-stage builds, turbo prune, BuildKit cache/secret mounts, the single-port Nginx proxy, Redis, or Sentry source-map upload.
frameworks:
  - docker
  - turborepo
languages:
  - dockerfile
  - yaml
category: deployment
updated: 2026-08-15
---

# Docker Deployment Patterns

## Quick Reference

| App | Dockerfile | Port (EXPOSE) | Healthcheck | CMD |
|-----|-----------|------|-------------|-----|
| Web (Next.js standalone) | `apps/web/Dockerfile` | 3001 | none in image (compose/ALB probes it) | `node apps/web/server.js` |
| Backend (NestJS) | `apps/backend/Dockerfile` | 3000 | `wget --spider :3000/api/v1/health` | `node apps/backend/dist/main.js` |

There is no root Dockerfile — only the two above.

## Monorepo Strategy — `turbo prune`

Both images use Turborepo's `turbo prune --docker` to build a minimal per-app context.

### Base stage bootstrap (both images)

```dockerfile
FROM node:22-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat          # backend also: wget (for healthcheck)
RUN npm install -g pnpm@10.27.0              # NOT corepack
WORKDIR /app

FROM base AS prepare
RUN npm install -g turbo                      # separate global install, not pnpm dlx
COPY . .
RUN turbo prune @repo/web --docker            # or @repo/backend
```

Note: pnpm and turbo are installed via `npm install -g`, not `corepack enable`.

### Install step — BuildKit cache mount (both images)

```dockerfile
FROM base AS builder
COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm config set fetch-retries 5 && \
  pnpm config set fetch-retry-maxtimeout 120000 && \
  pnpm config set network-concurrency 8 && \
  pnpm install --frozen-lockfile
```

The cache mount survives retries; it requires BuildKit (default here). Install layer comes BEFORE the `NEXT_PUBLIC_*` args so changing a public URL does not re-download deps.

### Web runner

```dockerfile
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
EXPOSE 3001
CMD node apps/web/server.js
```

- No `HEALTHCHECK` in the web image; no `ENV PORT=`/`HOSTNAME=` — those come from compose (`PORT=3001`, `HOSTNAME=0.0.0.0`). The standalone server defaults to 3000, so PORT must be set at runtime.

### Backend runner

```dockerfile
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=prepare  --chown=nodejs:nodejs /app/out/json/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules       # root workspace deps
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1
CMD node apps/backend/dist/main.js
```

- Builder sets `ENV TURBO_FORCE_BUILD=1` then `pnpm run build`.
- Runtime path is `./apps/backend/dist/main.js` (not `./dist`); both root and app `node_modules` are copied for workspace package resolution.

## Web Sentry build wiring

The web build optionally uploads source maps. Build args (all passed unconditionally; an unset arg becomes an empty ENV, which `apps/web/env.ts` normalises back to "off"):

```dockerfile
ARG NEXT_PUBLIC_SENTRY_ENABLED
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_ENVIRONMENT                 # projected onto the browser twin in next.config.ts
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ARG SENTRY_ORG
ARG SENTRY_PROJECT
# ...corresponding ENV lines...

COPY --from=prepare /app/out/full/ .
RUN --mount=type=secret,id=sentry_auth_token,required=false \
  if [ -f /run/secrets/sentry_auth_token ]; then \
    export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
  fi; \
  pnpm --filter @repo/observability build && \
  pnpm --filter @repo/web build
```

- `SENTRY_AUTH_TOKEN` is a **BuildKit secret mount**, never an ARG/ENV — a build arg is recorded in `docker history` and this token is an org write credential. `required=false` keeps contributor/CI builds (no Sentry) working.
- `@repo/observability` is built before web (web imports its redaction policy).
- Backend Dockerfile has NO Sentry build args — backend Sentry is all runtime env.

See `observability-sentry` and the CI `--secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN` build step.

## docker-compose.yml (local, single-port proxy)

The real compose file is NOT two bare services on `3001:3001`/`3000:3000`. It is a single-entrypoint Nginx proxy in front of loopback-bound apps, plus Redis.

```yaml
services:
  nginx:
    image: nginx:alpine
    profiles: ["docker-proxy"]           # ON by default via COMPOSE_PROFILES in root .env
    ports: ["80:80", "443:443"]          # clean URLs, no :port; :443 used by prod config
    environment:
      - WEB_UPSTREAM=${WEB_UPSTREAM:-web:3001}
      - BACKEND_UPSTREAM=${BACKEND_UPSTREAM:-backend:3000}
    extra_hosts: ["host.docker.internal:host-gateway"]
    volumes:
      # mounted as a TEMPLATE; the image's envsubst entrypoint writes conf.d/default.conf
      - ${NGINX_CONF:-./nginx/nginx.dev.conf}:/etc/nginx/templates/default.conf.template:ro
      - ${NGINX_CERTS_DIR:-./nginx/certs}:/etc/nginx/certs:ro
      - ${NGINX_ACME_WEBROOT:-./nginx/certbot}:/var/www/certbot
    depends_on: [web, backend]

  web:
    build: { context: ., dockerfile: apps/web/Dockerfile, args: [NEXT_PUBLIC_*] }
    ports: ["127.0.0.1:3001:3001"]       # loopback only — not on the LAN
    environment: [NODE_ENV=production, PORT=3001, HOSTNAME=0.0.0.0,
                  INTERNAL_API_BASE_URL=http://backend:3000/api, NEXT_PUBLIC_*]
    env_file: [apps/web/.env]

  backend:
    build: { context: ., dockerfile: apps/backend/Dockerfile }
    ports: ["127.0.0.1:3000:3000"]       # loopback only
    extra_hosts: ["host.docker.internal:host-gateway"]
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379   # host = service name, not localhost
    env_file: [apps/backend/.env]
    depends_on: [redis]
    healthcheck: { test: wget --spider :3000/api/v1/health, ... }

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD:?REDIS_PASSWORD is required}", "--appendonly", "no"]
    # NO ports: mapping — reachable only inside the compose network
    healthcheck: { test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"], ... }

networks:
  app-network: { driver: bridge }
```

Key points:
- **Single port**: reach the whole stack at `http://localhost` (Nginx routes `/api/*`→backend, `/*`→web). Toggle the proxy with `COMPOSE_PROFILES` — empty disables the nginx container so an external/host Nginx can use port 80 and reach the loopback-published apps. See `nginx-proxy`.
- **Loopback binding**: web/backend publish on `127.0.0.1:3001`/`:3000`, not `3001:3001` — not exposed to the LAN, but a host Nginx (or the Docker Nginx via service name) can reach them.
- **Redis** (AB-2): password required (no default), `--appendonly no`, no published ports; the backend must point `REDIS_URL` at the `redis` service name. Without it the backend silently falls back to process-local throttle counters + RBAC cache.
- `docker-compose.production.yml` binds web/backend to `0.0.0.0:3001`/`:3000` (ALB health checks reach them) and carries the Sentry + Redis runtime env; it has no nginx service (the ALB fronts it).

## Common Commands

```bash
docker compose up -d --build            # full stack behind Nginx on :80
COMPOSE_PROFILES= docker compose up -d   # disable bundled Nginx (use external proxy)
docker compose restart nginx            # pick up edited ./nginx/*.conf
docker compose logs -f backend
docker compose down --volumes
```

## Image Optimization Rules

1. `node:22-alpine` base.
2. Multi-stage: `base` → `prepare` (turbo prune) → `builder` → `runner`.
3. Non-root `nextjs`/`nodejs` user (uid 1001).
4. Install layer before `NEXT_PUBLIC_*` args; BuildKit `--mount=type=cache,id=pnpm-store`.
5. `turbo prune --docker` for a minimal context.
6. `.dockerignore` excludes `node_modules`, `.next`, `dist`, `.git`.
7. Secrets (`SENTRY_AUTH_TOKEN`) via `--mount=type=secret`, never ARG.

## Build Args vs Runtime Env

| Type | When | Examples |
|------|------|----------|
| Build arg (`ARG`) | build time, inlined | `NEXT_PUBLIC_*`, `SENTRY_ORG`/`SENTRY_PROJECT`, `NEXT_PUBLIC_SENTRY_*`, `SENTRY_ENVIRONMENT` (web) |
| BuildKit secret | build time, not in history | `SENTRY_AUTH_TOKEN` |
| Runtime env | container start (compose/SSM) | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `REDIS_URL`, backend `SENTRY_*`, `PORT`, `HOSTNAME` |
