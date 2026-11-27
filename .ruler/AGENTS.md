# AGENTS.md — Quanby Turbo Template

This is the primary instruction file for AI coding agents. Ruler concatenates it first, followed by the modular rule files in `.ruler/`. Global rules live here. Detailed rules live in the files listed under [Detailed Rules](#detailed-rules).

> **Do not edit generated files** (`AGENTS.md`, `CLAUDE.md`, `.clinerules`, `*/skills/` at the repo root). Edit the sources in `.ruler/`, then run `pnpm dlx @intellectronica/ruler apply`.

## Project Overview

A **Turborepo + pnpm** monorepo template with three apps and shared workspace packages.

| Layer          | Technology                        | Location                  |
| -------------- | --------------------------------- | ------------------------- |
| Web frontend   | Next.js 16 (App Router), React    | `apps/web/`               |
| Backend API    | NestJS + oRPC (contract-first)    | `apps/backend/`           |
| Mobile         | Flutter (Riverpod)                | `apps/mobile/`            |
| Database       | Drizzle ORM + PostgreSQL          | `packages/db/`            |
| Auth           | Better Auth                       | `packages/auth/`          |
| API contracts  | oRPC contracts, Zod schemas, DTOs | `packages/contracts/`     |
| Observability  | Shared Sentry redaction policy    | `packages/observability/` |
| Web E2E tests  | Playwright                        | `packages/e2e-web/`       |
| Styling        | Tailwind CSS v4 + shadcn/ui       | `apps/web/`               |
| Data fetching  | TanStack Query + oRPC client      | `apps/web/`               |
| Shared tooling | ESLint, Prettier, TS configs      | `tooling/`                |

Local dev ports: web `:3001`, backend `:3000` (API at `/api/v1`, docs at `/api/v1/docs`).

## Global Rules

### Package management

- **Always use `pnpm`. Never use `npm`, `yarn`, or `npx`.** Use `pnpm dlx` for one-off binaries.
- Target a workspace with `pnpm -F @repo/<name> <script>`.
- Reference internal packages as `"@repo/<name>": "workspace:*"`.
- Run `pnpm lint:ws` (sherif) after changing dependencies.

### Monorepo conventions

- Import shared code through `@repo/*` aliases (`@repo/contracts`, `@repo/db`, `@repo/db/schema`, `@repo/auth`). Never use relative paths across workspace boundaries.
- Keep features isolated in their own folders (`features/<name>/` on web, `modules/v1/<name>/` on backend, `features/<name>/` on mobile).
- API contracts are the single source of truth. Define or change endpoints in `packages/contracts/` first, then implement them on the backend and consume them on clients.
- Database schema changes go through `packages/db/src/schema/` and `pnpm db:generate` / `pnpm db:push`.

### Type safety

- TypeScript everywhere. No `.js` source files (config files excepted).
- Infer types from schemas (`z.infer<typeof Schema>`) instead of duplicating them.
- Avoid `any` (ESLint warns on it). Validate external data with Zod at the boundary.
- Co-locate types with the code that uses them. See `co-locate-types.md`.
- No barrel files (`index.ts` re-exports) in `apps/`. Package entrypoints are the exception. See `no-barrel-files.md`.

### Naming

- TypeScript files and folders use kebab-case (`user-profile.tsx`, `use-todos-query.ts`).
- Dart files use snake_case (`user_profile.dart`).

### Environment and secrets

- Never commit secrets or real credentials.
- When adding an env var, update both the app's `.env.example` and its `env.ts` validation.

### Before you finish

Run these from the repo root and fix every failure:

```bash
pnpm lint && pnpm typecheck
pnpm format:fix
pnpm test            # when you touched logic covered by tests
```

## Agents and Skills

Skills live in `.ruler/skills/`, one folder per skill with a `SKILL.md`. Ruler copies them into each agent's native skills directory. There are two kinds.

### Stack skills

These hold this repo's patterns for a specific technology (`drizzle-postgres`, `orpc-contracts`, `nestjs-framework`, `nextjs-app-router`, and so on). Before implementing, debugging, or reviewing, load the matching one and delegate substantial work to the matching agent. The mapping is in `agent-skill-utilization.md`.

### Workflow skills

These describe how to work, whatever the stack. Use them alongside the stack skills.

| Skill                            | Use it when                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `grilling`                       | A plan or design is still vague and needs stress-testing through questions      |
| `spec-driven-development`        | Starting a feature or significant change that has no written spec               |
| `planning-and-task-breakdown`    | You have a spec and need ordered, verifiable tasks                              |
| `test-driven-development`        | Implementing any feature or bug fix, before writing implementation code         |
| `systematic-debugging`           | Any bug, test failure, or unexpected behavior, before proposing a fix           |
| `code-review-and-quality`        | Reviewing a diff or PR, your own or someone else's, before merge                |
| `verification-before-completion` | About to claim work is done, fixed, or passing, or about to commit or open a PR |

A typical feature runs through them in that order. Small, unambiguous changes can skip the first three.

The workflow skills are unmodified copies from open-source collections (each folder has a `SOURCE.md` and `LICENSE`), so they are not written for this repo. When you use them:

- **This file and the other `.ruler/*.md` rules win on any conflict.** Their examples use `npm` and `npx`. Use `pnpm`, `pnpm -F @repo/<name>`, and `pnpm dlx` instead.
- They mention sibling skills that are not installed here (for example `superpowers:executing-plans`, `incremental-implementation`, `security-and-hardening`). Use the closest local skill, such as `security-hardening`, or skip the reference.
- Where a skill names a default output path (`SPEC.md`, `tasks/plan.md`), ask the user where the file should go before creating it.

## Common Commands

```bash
pnpm dev                 # all apps (watch)   | pnpm dev:web / dev:backend / dev:mobile
pnpm build               # build everything
pnpm lint | lint:fix     # ESLint
pnpm format | format:fix # Prettier
pnpm typecheck           # tsc across workspaces
pnpm test | test:cov     # unit tests (Flutter optional)
pnpm test:e2e:web        # Playwright web E2E
pnpm db:generate | db:push | db:migrate | db:seed | db:studio
pnpm auth:generate       # Better Auth types
```

## Detailed Rules

Ruler appends these files after this one. Read the file for the area you are working in.

| File                         | Scope                                                               |
| ---------------------------- | ------------------------------------------------------------------- |
| `agent-skill-utilization.md` | Which skill to load and which agent to delegate to                  |
| `project-rules.md`           | Monorepo structure, scripts, TypeScript standards                   |
| `web-rules.md`               | `apps/web/`: folders, oRPC + TanStack Query, components             |
| `backend-rules.md`           | `apps/backend/`: NestJS modules, versioning, DI                     |
| `mobile-rules.md`            | `apps/mobile/`: Flutter structure, Riverpod, API calls              |
| `packages-rules.md`          | `packages/` and `tooling/` conventions                              |
| `tailwind.md`                | `size-*` utility preference in `apps/web/`                          |
| `no-barrel-files.md`         | Ban on re-export `index.ts` files in apps                           |
| `co-locate-types.md`         | Keep types next to their usage                                      |
| `skills/*/SKILL.md`          | Stack and workflow skills (copied to each agent's skills directory) |
