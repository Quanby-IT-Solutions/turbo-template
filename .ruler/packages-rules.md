---
description: Shared packages and tooling conventions
globs: ["packages/**/*.ts", "tooling/**/*.ts", "tooling/**/*.js", "tooling/**/*.mjs"]
alwaysApply: false
---

# Shared Packages & Tooling Rules

## Overview

The monorepo uses two directories for shared code:

- **`packages/`** - Shared business logic consumed by apps
- **`tooling/`** - Development tooling and configurations

## Packages (`packages/`)

### Current Packages

| Package           | Import                                         | Purpose                                    |
| ----------------- | ---------------------------------------------- | ------------------------------------------ |
| `@repo/auth`      | `import { auth } from "@repo/auth"`            | Better Auth configuration                  |
| `@repo/db`        | `import { db } from "@repo/db"`                | Drizzle client and schema                  |
| `@repo/contracts` | `import { v1Contract } from "@repo/contracts"` | oRPC contracts, Zod schemas, type-safe API |

### Package Structure

Each package follows this structure:

```
packages/[name]/
├── src/
│   ├── index.ts          # Package entrypoint (exports public API)
│   └── [modules]/        # Internal modules
├── package.json          # Package manifest
├── tsconfig.json         # TypeScript config (extends tooling/typescript/pkg.json)
└── turbo.json            # Turbo build config
```

### `@repo/auth` - Authentication

Shared Better Auth configuration used by both web and backend:

```
packages/auth/src/
├── index.ts              # Exports auth instance and types
├── config.ts             # Better Auth configuration
└── types.ts              # Auth-related type exports (allowed exception)
```

Usage:

```typescript
import { auth, createAuth, type Session, type User } from "@repo/auth"
```

### `@repo/db` - Database

Drizzle ORM schema and client:

```
packages/db/src/
├── index.ts              # Exports schema and client
├── client.ts             # Database client factory
└── schema/
    ├── index.ts          # Schema re-exports
    ├── auth.ts           # Auth-related tables
    └── todos.ts          # Feature schemas
```

Usage:

```typescript
import { createDBClient, db } from "@repo/db"
import { todos, users } from "@repo/db/schema"
```

### `@repo/contracts` - API Contracts

Each feature is split into two files:

- `.schema.ts` — Zod schemas and inferred TypeScript types (no oRPC dependency)
- `.contract.ts` — oRPC route definitions that reference schemas from the schema file

```
packages/contracts/src/
├── index.ts              # Public exports (re-exports from contracts.ts)
├── contracts.ts          # Central contract registry (re-exports version routers)
├── modules/
    └── v1/
        ├── v1.contract.ts    # V1 router — assembles all v1 feature contracts with /v1 prefix
        └── [feature]/
            ├── [feature].contract.ts  # oRPC route definitions (method, path, input/output)
            └── [feature].schema.ts    # Zod schemas and inferred TypeScript types
```

Schema file pattern (`.schema.ts`):

```typescript
// [feature].schema.ts
import { z } from "zod"

// Base schema
export const TodoSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1).max(255),
	completed: z.boolean().default(false),
})

// Input schemas (derived from base)
export const CreateTodoSchema = TodoSchema.pick({ title: true, completed: true })

// Inferred TypeScript types
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>
```

Contract file pattern (`.contract.ts`):

```typescript
// [feature].contract.ts
import { oc } from "@orpc/contract"
import { z } from "zod"

import { CreateTodoSchema, TodoSchema } from "./[feature].schema.js"

export const todoContract = {
	list: oc
		.route({ method: "GET", path: "/todos", summary: "List all todos", tags: ["Todos"] })
		.output(z.array(TodoSchema)),

	create: oc
		.route({ method: "POST", path: "/todos", summary: "Create todo", tags: ["Todos"] })
		.input(CreateTodoSchema)
		.output(TodoSchema),
}
```

Version router pattern (`v1.contract.ts`):

```typescript
// v1.contract.ts
import { oc } from "@orpc/contract"

export const v1Contract = oc.prefix("/v1").router(
	oc.router({
		health: healthContract,
		example: v1Example,
	})
)

export type V1Contract = typeof v1Contract
```

---

## Tooling (`tooling/`)

Development configurations shared across all apps.

### Structure

```
tooling/
├── eslint/               # ESLint configurations
│   ├── eslint.config.mjs # Base config
│   ├── nest.mjs          # NestJS-specific rules
│   ├── next.mjs          # Next.js-specific rules
│   └── pkg.mjs           # Package-specific rules
├── prettier/             # Prettier configuration
│   └── index.js          # Shared Prettier config
└── typescript/           # TypeScript base configs
    ├── nest.json         # NestJS apps
    ├── next.json         # Next.js apps
    ├── pkg.json          # Packages
    └── tool.json         # Tooling packages
```

### Using Tooling Configs

**ESLint** (in app's `eslint.config.mjs`):

```javascript
import nestConfig from "@repo/eslint-config/nest.mjs"

export default [...nestConfig]
```

**TypeScript** (in app's `tsconfig.json`):

```json
{
	"extends": "@repo/typescript-config/next.json"
}
```

**Prettier** (in app's `package.json` or `.prettierrc`):

```json
{
	"prettier": "@repo/prettier-config"
}
```

---

## Creating a New Package

1. Create the package directory:

   ```
   packages/[name]/
   ├── src/
   │   └── index.ts
   ├── package.json
   └── tsconfig.json
   ```

2. Set up `package.json`:

   ```json
   {
   	"name": "@repo/[name]",
   	"version": "0.0.0",
   	"private": true,
   	"exports": {
   		".": "./src/index.ts"
   	},
   	"scripts": {
   		"build": "tsc",
   		"dev": "tsc --watch"
   	}
   }
   ```

3. Extend TypeScript config:

   ```json
   {
   	"extends": "@repo/typescript-config/pkg.json",
   	"include": ["src"],
   	"exclude": ["node_modules"]
   }
   ```

4. Add to consuming app's dependencies:
   ```json
   {
   	"dependencies": {
   		"@repo/[name]": "workspace:*"
   	}
   }
   ```

---

## Rules

### Package Exports

- **Packages MUST have an `index.ts`** - This is an allowed exception to the no-barrel rule
- Export only the public API from `index.ts`
- Keep internal modules private (not exported from index)

### Type Definitions

- **`packages/contracts/`** is allowed to have type-focused files (exception to co-locate rule)
- **`packages/db/src/schema/`** contains Drizzle schema definitions (allowed exception)
- Other packages should co-locate types with implementation

### Dependencies

- Packages should minimize external dependencies
- Prefer peer dependencies for framework-specific packages
- Use `workspace:*` for internal package dependencies
