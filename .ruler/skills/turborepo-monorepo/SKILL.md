---
name: turborepo-monorepo
description: Turborepo monorepo structure and pnpm workspace conventions. Use when adding packages, configuring build pipelines, managing dependencies, running scripts, or working with the monorepo root config. Triggers on tasks involving workspace setup, package management, turbo.json, pnpm-workspace.yaml, catalogs, or cross-package dependencies.
frameworks:
  - turborepo
languages:
  - typescript
category: tooling
updated: 2026-08-15
---

# Turborepo Monorepo Skill

## Quick Reference

**When to Use**: Adding workspace packages, configuring build pipelines, managing dependencies, or cross-package operations

**Package Manager**: pnpm 10.27.0 (NEVER use npm or yarn)

**Runtime**: Node.js ≥22.20.0

## Workspace Structure

```
turbo-template/
├── apps/
│   ├── web/              # Next.js 16 frontend (port 3001)
│   ├── backend/          # NestJS API server (port 3000)
│   └── mobile/           # Flutter mobile app
├── packages/
│   ├── auth/             # @repo/auth — Better Auth config
│   ├── db/               # @repo/db — Drizzle schema + client
│   ├── contracts/        # @repo/contracts — oRPC contracts + Zod schemas
│   ├── observability/    # @repo/observability — shared log-redaction + Sentry scrubbing policy
│   └── e2e-web/          # @repo/e2e-web — Playwright end-to-end suite for web
├── tooling/
│   ├── eslint/           # @repo/eslint-config — ESLint configs
│   ├── prettier/         # @repo/prettier-config — Prettier config
│   └── typescript/       # @repo/tsconfig — TSConfig bases
├── turbo.json            # Task pipeline configuration
├── pnpm-workspace.yaml   # Workspace definition + catalogs
└── package.json          # Root scripts
```

## pnpm Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
  - tooling/*

# Default version catalog — pin shared dependency versions
catalog:
  "@nestjs/common": ^11.1.11
  "@nestjs/core": ^11.1.11
  "@orpc/contract": ^1.13.4
  "@orpc/nest": ^1.13.4
  "@sentry/nestjs": ^10.70.0
  "@sentry/nextjs": ^10.70.0
  "@tanstack/react-query": ^5.90.16
  better-auth: 1.4.12
  drizzle-orm: 1.0.0-beta.9-e89174b   # note the -e89174b build suffix
  next: 16.1.1
  react: 19.2.3
  tailwindcss: ^4.1.18
  typescript: ^5.9.3
  zod: ^4.3.5
  # ...also @orpc/openapi is a direct backend dep (^1.13.4), not catalogued

# Named catalog for React 19 alignment
catalogs:
  react19:
    "@types/react": ^19.2.7
    "@types/react-dom": ^19.2.3
    react: 19.2.3
    react-dom: 19.2.3

linkWorkspacePackages: true

overrides:
  "@types/minimatch": 5.1.2
  "@types/react": 19.2.7
  "@types/react-dom": 19.2.3

publicHoistPattern:
  - "@ianvs/prettier-plugin-sort-imports"
  - prettier-plugin-tailwindcss
```

- Reference a catalogued version with `"dep": "catalog:"`, or a named catalog with `"dep": "catalog:react19"`.
- `overrides` force a single version tree-wide; `publicHoistPattern` hoists the two Prettier plugins so ESLint/Prettier can resolve them.
- `onlyBuiltDependencies` allow-lists native build scripts (argon2, sharp, esbuild, @swc/core, @nestjs/core, …).

## Common Scripts

### Development
```bash
pnpm dev              # turbo watch dev --continue (all apps)
pnpm dev:web          # web (+deps)
pnpm dev:backend      # backend (+deps)
pnpm dev:mobile       # mobile (Flutter)
```

### Build & Quality
```bash
pnpm build            # turbo run build
pnpm start            # turbo run start
pnpm lint             # ESLint (cached)
pnpm lint:fix
pnpm format           # Prettier check (cached)
pnpm format:fix
pnpm typecheck        # tsc --noEmit across packages
pnpm lint:ws          # workspace dep check (sherif)
```

### Test
```bash
pnpm test             # turbo run test (vitest projects: web, contracts, auth; backend jest)
pnpm test:cov         # turbo run test:cov (enforces coverage floors)
pnpm test:e2e:web     # Playwright suite (@repo/e2e-web)
pnpm show-report:e2e:web
```

### Database
```bash
pnpm db:push          # push schema (dev)
pnpm db:generate      # generate migrations
pnpm db:migrate       # run migrations
pnpm db:seed          # seed data
pnpm db:studio        # Drizzle Studio
```

### Auth
```bash
pnpm auth:generate    # regenerate Better Auth types
```

## Turbo Pipeline (`turbo.json`)

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "topo": { "dependsOn": ["^topo"] },
    "build": {
      "dependsOn": ["^build", "^lint", "^typecheck"],
      "outputs": [".cache/tsbuildinfo.json", "dist/**"],
      "cache": true
    },
    "dev": { "cache": false, "persistent": false },
    "start": { "dependsOn": ["^build", "build"], "cache": false, "persistent": true },
    "format": { "outputs": [".cache/.prettiercache"], "outputLogs": "new-only" },
    "lint": { "dependsOn": ["^topo", "^build"], "outputs": [".cache/.eslintcache"], "cache": true },
    "typecheck": { "dependsOn": ["^topo", "^build"], "outputs": [".cache/tsbuildinfo.json"], "cache": true },
    "test": { "dependsOn": ["^build", "^test"], "cache": true, "outputs": ["coverage/**"] },
    "test:cov": { "dependsOn": ["^build", "^test:cov"], "cache": true, "outputs": ["coverage/**"] },
    "test:e2e": {
      "cache": false,
      "persistent": false,
      "passThroughEnv": ["PLAYWRIGHT_*", "BASE_URL", "BACKEND_URL", "E2E_TEST_EMAIL", "E2E_TEST_PASSWORD", "E2E_TEST_NAME"]
    },
    "clean": { "cache": false },
    "push": { "cache": false, "interactive": true },
    "studio": { "cache": false, "persistent": true }
  },
  "globalEnv": [],
  "globalPassThroughEnv": [
    "NODE_ENV", "CI", "VERCEL", "VERCEL_ENV", "VERCEL_URL",
    "npm_lifecycle_event", "LOCALAPPDATA", "PUB_CACHE"
  ]
}
```

**Key points:**
- `topo` is a synthetic anchor task (`^topo`) that lint/typecheck depend on to force topological ordering without a real build side-effect.
- `build` depends on `^lint` + `^typecheck` as a quality gate; `dev` and the `test:e2e`/`push`/`studio` tasks are uncached.
- `test:e2e` passes Playwright + test-account env through (`PLAYWRIGHT_*`, `BASE_URL`, credentials).
- `globalEnv` is empty; `globalPassThroughEnv` adds `npm_lifecycle_event`, `LOCALAPPDATA` (Windows), `PUB_CACHE` (Flutter) beyond the Vercel/CI defaults.
- `ui: "tui"` uses the interactive terminal UI.

## Package Cross-References

```json
// consumer package.json
{ "dependencies": { "@repo/auth": "workspace:*", "@repo/contracts": "workspace:*",
                    "@repo/db": "workspace:*", "@repo/observability": "workspace:*" } }
```

```typescript
import { auth } from "@repo/auth"
import { v1Contract } from "@repo/contracts"
import { createDBClient } from "@repo/db/client"
import { todos, users } from "@repo/db/schema"
import { sanitizeLogUrl } from "@repo/observability"
```

### Next.js transpilePackages

```typescript
// apps/web/next.config.ts
transpilePackages: ["@repo/auth", "@repo/backend", "@repo/contracts", "@repo/db", "@t3-oss/env-core", "@t3-oss/env-nextjs"]
```

## Creating a New Package

1. `packages/[name]/` with `src/index.ts`, `package.json`, `tsconfig.json`.
2. Manifest:
   ```json
   { "name": "@repo/[name]", "version": "0.0.0", "private": true, "type": "module",
     "exports": { ".": "./src/index.ts" },
     "scripts": { "build": "tsc", "dev": "tsc --watch" } }
   ```
3. TypeScript config (note the package is `@repo/tsconfig`, exports `./pkg`, `./nest.json`, `./next.json`, `./tool`):
   ```json
   { "extends": "@repo/tsconfig/pkg", "include": ["src"], "exclude": ["node_modules"] }
   ```
4. Add to consumers with `"@repo/[name]": "workspace:*"`, then `pnpm install`.

## Tooling Config Sharing

```javascript
// eslint.config.mjs
import nestConfig from "@repo/eslint-config/nest.mjs"
export default [...nestConfig]
```
```json
// tsconfig.json  (apps/web -> next.json, apps/backend -> nest.json, packages -> pkg)
{ "extends": "@repo/tsconfig/next.json" }
```
```json
// package.json
{ "prettier": "@repo/prettier-config" }
```

## Key Rules

1. Always `pnpm` — never `npm`/`yarn`.
2. `workspace:*` for internal deps.
3. `catalog:` / `catalog:react19` for shared version pinning.
4. Packages MUST have `index.ts` (barrel exception); apps must NOT.
5. Run `pnpm lint && pnpm typecheck` before committing.
6. Add `transpilePackages` in Next.js for workspace packages.
7. Update `.env.example` when adding env vars.
