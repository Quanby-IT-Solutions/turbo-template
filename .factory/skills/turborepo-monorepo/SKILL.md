---
name: turborepo-monorepo
description: Turborepo monorepo structure and pnpm workspace conventions. Use when adding packages, configuring build pipelines, managing dependencies, running scripts, or working with the monorepo root config. Triggers on tasks involving workspace setup, package management, turbo.json, pnpm-workspace.yaml, or cross-package dependencies.
frameworks:
  - turborepo
languages:
  - typescript
category: tooling
updated: 2026-03-06
---

# Turborepo Monorepo Skill

## Quick Reference

**When to Use**: Adding workspace packages, configuring build pipelines, managing dependencies, or cross-package operations

**Package Manager**: pnpm 10.27+ (NEVER use npm or yarn)

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
│   └── contracts/        # @repo/contracts — oRPC contracts + Zod schemas
├── tooling/
│   ├── eslint/           # @repo/eslint-config — ESLint configs
│   ├── prettier/         # @repo/prettier-config — Prettier config
│   └── typescript/       # @repo/typescript-config — TSConfig bases
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

# Version catalog — pin shared dependency versions
catalog:
  "@orpc/contract": ^1.13.4
  "@tanstack/react-query": ^5.90.16
  better-auth: 1.4.12
  drizzle-orm: 1.0.0-beta.9
  next: 16.1.1
  react: 19.2.3
  tailwindcss: ^4.1.18
  typescript: ^5.9.3
  zod: ^4.3.5
```

## Common Scripts

### Development
```bash
pnpm dev              # Start all apps in dev mode
pnpm dev:web          # Start only web app
pnpm dev:backend      # Start only backend app
pnpm dev:mobile       # Start only mobile app (Flutter)
```

### Build & Quality
```bash
pnpm build            # Build all apps (respects pipeline deps)
pnpm lint             # ESLint across all packages
pnpm lint:fix         # ESLint auto-fix
pnpm format           # Check Prettier formatting
pnpm format:fix       # Fix Prettier formatting
pnpm typecheck        # TypeScript type checking
pnpm lint:ws          # Check workspace deps (sherif)
```

### Database
```bash
pnpm db:push          # Push schema changes (dev)
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio
```

### Auth
```bash
pnpm auth:generate    # Regenerate Better Auth types
```

## Turbo Pipeline Configuration

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build", "^lint", "^typecheck"],
      "outputs": [".cache/tsbuildinfo.json", "dist/**"],
      "cache": true
    },
    "dev": { "cache": false, "persistent": false },
    "lint": {
      "dependsOn": ["^topo", "^build"],
      "outputs": [".cache/.eslintcache"],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^topo", "^build"],
      "outputs": [".cache/tsbuildinfo.json"],
      "cache": true
    }
  },
  "globalPassThroughEnv": ["NODE_ENV", "CI", "VERCEL", "VERCEL_ENV", "VERCEL_URL"]
}
```

**Key points:**
- `^build` = build dependencies first (topological)
- `build` depends on `^lint` + `^typecheck` for quality gate
- `dev` is not cached (live reload)
- `globalPassThroughEnv` passes env vars to all tasks

## Package Cross-References

### Importing Workspace Packages

```json
// In apps/web/package.json or apps/backend/package.json
{
  "dependencies": {
    "@repo/auth": "workspace:*",
    "@repo/contracts": "workspace:*",
    "@repo/db": "workspace:*"
  }
}
```

```typescript
// Usage in app code
import { auth } from "@repo/auth"
import { v1Contract } from "@repo/contracts"
import { createDBClient } from "@repo/db/client"
import { todos, users } from "@repo/db/schema"
```

### Package with Sub-Path Exports

```json
// packages/db/package.json
{
  "name": "@repo/db",
  "exports": {
    "./schema": { "types": "./dist/schema.d.ts", "default": "./dist/schema.js" },
    "./client": { "types": "./dist/client.d.ts", "default": "./dist/client.js" }
  }
}
```

### Next.js transpilePackages

```typescript
// apps/web/next.config.ts
const config: NextConfig = {
  transpilePackages: [
    "@repo/auth", "@repo/contracts", "@repo/db",
    "@t3-oss/env-core", "@t3-oss/env-nextjs",
  ],
}
```

## Creating a New Package

1. **Create directory structure:**
   ```
   packages/[name]/
   ├── src/index.ts
   ├── package.json
   └── tsconfig.json
   ```

2. **Package manifest:**
   ```json
   {
     "name": "@repo/[name]",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": { ".": "./src/index.ts" },
     "scripts": { "build": "tsc", "dev": "tsc --watch" }
   }
   ```

3. **TypeScript config:**
   ```json
   { "extends": "@repo/typescript-config/pkg.json", "include": ["src"], "exclude": ["node_modules"] }
   ```

4. **Add to consumers:**
   ```json
   { "dependencies": { "@repo/[name]": "workspace:*" } }
   ```

5. **Run `pnpm install`** to link the new package.

## Tooling Config Sharing

### ESLint
```javascript
// apps/backend/eslint.config.mjs
import nestConfig from "@repo/eslint-config/nest.mjs"
export default [...nestConfig]
```

### TypeScript
```json
// apps/web/tsconfig.json
{ "extends": "@repo/typescript-config/next.json" }
```

### Prettier
```json
// apps/web/package.json
{ "prettier": "@repo/prettier-config" }
```

## Key Rules

1. **Always use `pnpm`** — never `npm` or `yarn`
2. **Use `workspace:*`** for internal package dependencies
3. **Use pnpm catalog** for shared version pinning
4. **Packages MUST have `index.ts`** — exception to no-barrel-files rule
5. **Apps must NOT have barrel files** — import directly from specific files
6. **Run `pnpm lint && pnpm typecheck`** before committing
7. **Add `transpilePackages`** in Next.js for workspace packages
8. **Update `.env.example`** when adding environment variables
