---
description: General monorepo rules and conventions
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.dart"]
alwaysApply: true
---

# Quanby Turbo Template - AI Agent Rules

## Project Overview

This is a **Turborepo monorepo** template with three applications and shared packages. The architecture separates concerns across apps while sharing code through workspace packages.

## Technology Stack

| Layer           | Technology                               | Location                                                                          |
| --------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router)                  | `apps/web/`                                                                       |
| Backend         | NestJS                                   | `apps/backend/`                                                                   |
| Mobile          | Flutter                                  | `apps/mobile/`                                                                    |
| Database        | Drizzle ORM + PostgreSQL                 | `packages/db/`                                                                    |
| Auth            | Better Auth                              | `packages/auth/`                                                                  |
| Contracts       | Zod schemas + DTOs                       | `packages/contracts/`                                                             |
| API Layer       | oRPC                                     | `packages/contracts/`, `apps/web/services/orpc/`, `apps/backend/src/common/orpc/` |
| Styling         | Tailwind CSS + Shadcn UI                 | `apps/web/`                                                                       |
| Data Fetching   | TanStack Query                           | `apps/web/`                                                                       |
| Package Manager | pnpm (always use `pnpm`, never npm/yarn) |                                                                                   |

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
import { v1Contract, type V1Contract } from "@repo/contracts"
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

## Sub-Agent & Skills Workflow Policy

Use **sub-agents by default for feature work**; skip them only for trivial local changes.

### When to use sub-agents

- **Always** for feature work, bug fixes, refactors, tests, and code reviews.
- **Always** when a task touches more than one layer (e.g., contracts + backend + frontend).
- **Always** before implementing anything new — run `Explore` first for discovery.

### When to skip sub-agents

- One-line fixes, typo corrections, or config tweaks.
- Purely conversational or informational requests.
- If a sub-agent is unavailable, proceed directly and state the fallback.

### Required Flow (for non-trivial work)

1. **Discover** — Use `Explore` sub-agent to gather file targets, existing patterns, and constraints.
2. **Plan** — Produce a short implementation plan from sub-agent output.
3. **Implement** — Use the appropriate specialized sub-agent(s) for each layer:
   - `backend-developer` — NestJS modules, controllers, services, contracts, DB queries
   - `web-frontend-developer` — Next.js pages, components, hooks, oRPC client integration
   - `fullstack-developer` — Cross-layer features spanning backend + frontend + packages
   - `flutter-expert` — Flutter mobile features, widgets, state management
   - `devops-infra` — Docker, CI/CD, AWS, Terraform, deployment
   - `code-reviewer` — Code review and quality assessment
4. **Validate** — Run `pnpm lint && pnpm typecheck` and report results (note any pre-existing failures).

### Available Skills (domain-specific knowledge)

Skills provide deep context for specific technologies used in this repo. They are loaded automatically by AI agents from `.agents/skills/` when a task matches their domain:

| Skill                         | Domain                                   |
| ----------------------------- | ---------------------------------------- |
| `orpc-contracts`              | oRPC contract-first API design           |
| `drizzle-postgres`            | Drizzle ORM schemas, queries, migrations |
| `tanstack-query-orpc`         | TanStack Query + oRPC data fetching      |
| `better-auth`                 | Authentication, sessions, OAuth          |
| `nextjs-app-router`           | Next.js 16 App Router conventions        |
| `tailwind-shadcn`             | Tailwind CSS v4 + shadcn/ui components   |
| `turborepo-monorepo`          | pnpm workspaces, turbo.json, packages    |
| `testing-strategies`          | Unit, integration, E2E testing patterns  |
| `docker-deployment`           | Docker multi-stage builds, compose       |
| `aws-infrastructure`          | ECS Fargate, ALB, Terraform              |
| `ci-cd-pipelines`             | GitHub Actions workflows                 |
| `security-hardening`          | OWASP, auth guards, input validation     |
| `error-handling-logging`      | Exception filters, structured logging    |
| `vercel-react-best-practices` | React/Next.js performance optimization   |
| `web-design-guidelines`       | UI/UX accessibility and design review    |

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
