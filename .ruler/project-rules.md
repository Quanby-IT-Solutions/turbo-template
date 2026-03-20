---
description: General monorepo rules and conventions
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.dart"]
alwaysApply: true
---

# Quanby Turbo Template - AI Agent Rules

## Project Overview

This is a **Turborepo monorepo** template with three applications and shared packages. The architecture separates concerns across apps while sharing code through workspace packages.

## Technology Stack

| Layer           | Technology                               | Location              |
| --------------- | ---------------------------------------- | --------------------- |
| Frontend        | Next.js 16 (App Router)                  | `apps/web/`           |
| Backend         | NestJS                                   | `apps/backend/`       |
| Mobile          | Flutter                                  | `apps/mobile/`        |
| Database        | Drizzle ORM + PostgreSQL                 | `packages/db/`        |
| Auth            | Better Auth                              | `packages/auth/`      |
| Contracts       | Zod schemas + DTOs                       | `packages/contracts/` |
| Styling         | Tailwind CSS + Shadcn UI                 | `apps/web/`           |
| Data Fetching   | TanStack Query                           | `apps/web/`           |
| Package Manager | pnpm (always use `pnpm`, never npm/yarn) |                       |

## Monorepo Structure

```
turbo-template/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── backend/          # NestJS API server
│   └── mobile/           # Flutter mobile app
├── packages/
│   ├── auth/             # Shared auth configuration
│   ├── db/               # Drizzle schema and client
│   └── contracts/        # API contracts, Zod schemas, DTOs
└── tooling/
    ├── eslint/           # ESLint configurations
    ├── prettier/         # Prettier configuration
    └── typescript/       # TSConfig base files
```

## Cross-App Package Usage

Import shared packages using the `@repo/*` workspace alias:

```typescript
import { auth } from "@repo/auth"
import { CreateTodoDto, TodoSchema } from "@repo/contracts"
import { db } from "@repo/db"
import { todos } from "@repo/db/schema"
```

---

## Development Workflow

1. Use `pnpm` for all package management
2. Run `pnpm lint && pnpm typecheck` before committing
3. Run `pnpm format:fix` to fix formatting issues
4. Update `.env.example` and `env.ts` when adding environment variables
5. Keep features isolated in their own folders

## Common Scripts

### Development

```bash
pnpm dev              # Start all apps in development (watch mode)
pnpm dev:web          # Start only web app
pnpm dev:backend      # Start only backend app
pnpm dev:mobile       # Start only mobile app
pnpm start            # Start all apps in production mode
```

### Build & Clean

```bash
pnpm build            # Build all apps for production
pnpm clean            # Remove root node_modules
pnpm clean:workspaces # Clean all workspace node_modules
```

### Code Quality

```bash
pnpm lint             # Run ESLint across all packages
pnpm lint:fix         # Run ESLint and auto-fix issues
pnpm format           # Check formatting with Prettier
pnpm format:fix       # Fix formatting with Prettier
pnpm typecheck        # Run TypeScript type checking
pnpm lint:ws          # Check workspace dependencies (sherif)
```

### Database

```bash
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate Drizzle types/migrations
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio GUI
```

### Auth

```bash
pnpm auth:generate    # Generate Better Auth types
```

## TypeScript Standards

- Use TypeScript everywhere - no `.js` files allowed (except config files)
- Define proper types for all data structures
- Prefer inferring types from schemas (`z.infer<typeof Schema>`)
- Co-locate types with their usage (see co-locate-types rule)

## File Naming Conventions

| Context    | Convention | Examples                                 |
| ---------- | ---------- | ---------------------------------------- |
| TypeScript | kebab-case | `user-profile.tsx`, `auth-utils.ts`      |
| Flutter    | snake_case | `user_profile.dart`, `auth_service.dart` |
| Folders    | kebab-case | `user-management/`, `document-signing/`  |
| Components | kebab-case | `todo-card.tsx`, `user-avatar.tsx`       |
| Hooks      | kebab-case | `use-auth.ts`, `use-todos-query.ts`      |

---

## App-Specific Rules

See the following files for app-specific conventions:

- **`web-rules.md`** - Next.js frontend (`apps/web/`)
- **`backend-rules.md`** - NestJS API server (`apps/backend/`)
- **`mobile-rules.md`** - Flutter mobile app (`apps/mobile/`)
- **`packages-rules.md`** - Shared packages and tooling
