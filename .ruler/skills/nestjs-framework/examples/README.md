# NestJS Backend Examples (this repo)

Real patterns from `apps/backend`. This backend is NestJS 11 but uses oRPC +
Drizzle + Better Auth — NOT TypeORM, Passport/JWT, or class-validator. The old
`jwt-authentication` and `user-management-crud` examples described a stack that
does not exist here and have been removed.

## Available Examples

### 1. contract-first-crud.example.ts

Full CRUD mirroring the real `todos` module:
- Zod contract → Drizzle service → oRPC controller
- `@Implement(contract)` + `implement().handler()` (no `@Get/@Post/@Body`)
- Types inferred from `V1Inputs`/`V1Outputs`
- `db` queried directly (no repository)
- `ORPCError` for handler errors (not NestJS HTTP exceptions)
- Ownership scoped in the `where` clause (no TOCTOU / existence leak)
- `@AllowAnonymous`, `@RequirePermissions`, `@StrictThrottle`, `IdempotencyInterceptor`

Use when: building any resource endpoint.

### 2. better-auth-session-guard.example.ts

Authentication & authorization:
- `@AllowAnonymous()` vs `@Session()` in a controller
- A custom guard that resolves the session itself (global guard order is not
  guaranteed) and fails closed
- `@RequirePermissions()` enforced by the global `RbacGuard` (AND semantics)

Use when: protecting routes or reading the authenticated user.

## Real files to read next

- `apps/backend/src/modules/v1/examples/todos/*` — the canonical module
- `apps/backend/src/modules/v1/health/*` — the simplest (anonymous) module
- `apps/backend/src/shared/guards/rbac.guard.ts` — session resolution + permissions
- `apps/backend/src/config/api-versions.config.ts` — the `v1` contract alias

## Commands (pnpm + turbo — no `nest g`)

```bash
pnpm -F @repo/backend dev        # watch
pnpm -F @repo/backend test       # jest
pnpm -F @repo/backend lint
pnpm -F @repo/backend typecheck
pnpm -F @repo/db db:push         # push schema in dev
```

## Related

- [SKILL.md](../SKILL.md) — quick reference
- [REFERENCE.md](../REFERENCE.md) — guards, filters, throttler, RBAC, idempotency, logging
- [VALIDATION.md](../VALIDATION.md) — the Zod validation pipeline
- [templates/](../templates/) — controller/service/module/table/contract/spec templates
- sibling skills: `orpc-contracts`, `drizzle-postgres`, `better-auth`,
  `security-hardening`, `error-handling-logging`, `redis-caching`
