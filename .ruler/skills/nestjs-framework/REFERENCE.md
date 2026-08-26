---
name: NestJS Framework Reference
version: 2.0.0
framework_versions:
  min: 11.0.0
  max: 11.x
  recommended: 11.x
compatible_agents:
  backend-developer: ">=3.0.0"
description: Deep-dive on this repo's real NestJS 11 backend — guards, filters, throttler, RBAC, idempotency, logging. NOT a generic NestJS/TypeORM/GraphQL reference.
updated: 2026-08-15
---

# NestJS Backend — Reference (this repo)

Scope: the cross-cutting machinery in `apps/backend/src`. For routing/services see
SKILL.md; for validation see VALIDATION.md. This repo does NOT use TypeORM,
Passport, GraphQL, microservices, or class-validator — none of those are covered
because none exist here.

## Bootstrap order (`main.ts` / `bootstrap.ts` / `instrument.ts`)

1. `instrument.ts` runs FIRST (imported before AppModule) — installs the Sentry
   SDK ahead of the libraries it instruments. Reads Sentry keys off raw
   `process.env`, deliberately NOT the fail-fast `env.config` (so one bad
   unrelated var can't kill the crash reporter).
2. `env.config.ts` validates all env at module load (`@t3-oss/env-core`), fail-fast.
3. Bootstrap: `bodyParser: false` on create (Better Auth parses its own bodies),
   then a standalone `pinoHttp()` middleware (authoritative request logger),
   CORS (before auth), Better Auth versioned routes, helmet, body parsers.
4. `app.useLogger(nestjs-pino Logger)` so framework logs go through pino.

## Global providers (`app.module.ts`)

```typescript
{ provide: APP_PIPE, useClass: ZodValidationPipe }
{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
{ provide: APP_FILTER, useClass: SentryExceptionFilter }  // catch-all, registered first
{ provide: APP_FILTER, useClass: HttpExceptionFilter }    // @Catch(HttpException)
{ provide: APP_GUARD, useClass: ThrottlerProxyGuard }
{ provide: APP_GUARD, useClass: RbacGuard }
```

Request lifecycle: **pipe (validate input) → guards → interceptors → handler →
serializer interceptor (validate output) → filters (on throw)**.

## Exception Filters (two, split by type)

- `HttpExceptionFilter` (`@Catch(HttpException)`) — typed/deliberate errors incl.
  `ORPCError`. Renders `{ success, error: { code, message, details? }, timestamp }`.
  `Sentry.captureException` only when `status >= 5xx`. Emits the Zod issue tree for
  `ZodSerializationException`. Retry-After header (set by throttler) passes through.
  Logger is the injected `nestjs-pino` `Logger`, not console.
- `SentryExceptionFilter` (`@Catch()`) — everything else (bugs, driver faults).
  Captures unconditionally, logs the stack, renders a GENERIC 500 message (an
  unexpected exception may name a table/path/connection string).

Because `@Catch(HttpException)` is more specific, the catch-all never sees an
`HttpException` — so the same error is never double-reported.

## ORPCError mapping (inside handlers/services)

| ORPCError code | HTTP |
|----------------|------|
| `BAD_REQUEST` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `INTERNAL_SERVER_ERROR` | 500 |

Throwing a NestJS HTTP exception from inside `implement().handler()` yields a
generic 500 (oRPC doesn't understand it). Guards run OUTSIDE the handler, so they
throw NestJS exceptions normally.

## RbacGuard (`shared/guards/rbac.guard.ts`)

Global, inert unless `@RequirePermissions(...)` is present.

```typescript
const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
  context.getHandler(), context.getClass(),
]) // handler overrides class
if (!required?.length) return true

// Resolve the session itself — global guard order is NOT guaranteed, so this may
// run before the library AuthGuard. Read request.session, else getSession(headers).
let userId = request.session?.user?.id ?? request.user?.id
if (!userId) { /* getAuth().api.getSession({ headers: fromNodeHeaders(...) }) */ }
if (!userId) throw new UnauthorizedException("Authentication required") // fail closed

if (!(await this.rbacService.hasAllPermissions(userId, required))) {
  // audited denial; ForbiddenException (dev includes missingPermissions)
}
```

AND semantics. Denials are audited via the pino logger. See the better-auth skill
for the "resolve session in the guard" rationale.

## RbacService & cache (`common/rbac/`)

- `resolveForUser` reads the cache, else joins `userRoles→roles→rolePermissions→
  permissions`, builds `{ roleNames, permissionNames }` Sets, caches them.
- `matchPermission`: Admin role short-circuits true; unknown (non-catalog)
  permissions fail closed; supports `resource:*` wildcards.
- Privileged mutations (`assignRole`/`removeRole`) run in a transaction that
  writes the membership row AND its audit entry together (can't commit
  unrecorded); the RBAC cache is invalidated only AFTER commit. Guard rejections
  throw `PrivilegeGuardError` inside the tx (rolls back the mutation) and are
  re-recorded as an audited denial outside it, then re-thrown as `ORPCError`.
- Privilege-tier checks (`holdsAdmin`) read the DB inside the tx, never the cache.
- Cache degradation is fail-CLOSED (see redis-caching skill).

## Throttler (`app.module.ts` + `ThrottlerProxyGuard`)

Two named limiters: `default` (all routes) and `strict` (opt-in via
`@StrictThrottle()`, skipped elsewhere by a `skipIf` predicate). Counters in Redis
when `REDIS_URL` set, wrapped in `ResilientThrottlerStorage` (fail-OPEN).

`ThrottlerProxyGuard` overrides `getTracker` to key on the **rightmost-untrusted**
IP (`req.ips[req.ips.length - 1] ?? req.ip`) — the peer the trusted proxy accepted,
which a client cannot forge. Sound only while `nginx.conf` SETS `X-Forwarded-For`
and `TRUST_PROXY` equals the real hop count (RF2). See security-hardening.

## IdempotencyInterceptor (`shared/interceptors/idempotency.interceptor.ts`)

Opt-in via `@UseInterceptors(IdempotencyInterceptor)` on mutating handlers.

- No `Idempotency-Key` header → bypass. Invalid key → 400 before the handler.
  No resolvable author → bypass.
- oRPC handlers return a *procedure*, not a response — the interceptor wraps the
  procedure's own handler (`~orpc.handler`) so store-and-replay runs where the
  real input/response exist.
- Replay stored in `idempotencyKeys`, composite PK `(authorId, key)` — identity
  scoped so users can't squat keys. A Postgres advisory lock keyed on
  `hashtext(authorId:key)` serializes concurrent duplicates; the response is
  persisted in the SAME transaction (a handler error rolls back, nothing stored).
- Rows carry `expiresAt` and are swept by `MaintenanceModule`.

## Logging (`config/pino-logger.config.ts`)

One `buildPinoHttpOptions()` shared by the injectable Nest `Logger` and the
standalone pre-auth Express middleware (`autoLogging: false` on the module side to
avoid duplicate lines). Redacts `PINO_REDACT_PATHS` (`remove: true`) and strips
query strings / `?token=` links. `genReqId` reuses `req.id`, else a sanitized
inbound `X-Request-Id` (`sanitizeRequestId`: allowlist charset, ≤64 chars), else a
fresh UUID; echoed on the response header.

## Scheduled maintenance (`common/maintenance/`)

`@nestjs/schedule` sweeps expired rows: `verifications`, `idempotencyKeys`,
sessions — each has an `expires_at` index so the sweep is not a seq-scan.

## Config surface (`config/`)

| File | Purpose |
|------|---------|
| `env.config.ts` | typed env, fail-fast; `BETTER_AUTH_SECRET: authSecretSchema` |
| `app.config.ts` | CORS (`parseOriginList`), body-size (`MAX_REQUEST_BODY_SIZE`), graceful shutdown |
| `api-versions.config.ts` | `v1` alias + `API_VERSIONS` registry, `getVersionKeys()` |
| `contract-types.ts` | `V1Inputs` / `V1Outputs` inference |
| `security-headers.config.ts` | helmet CSP/HSTS |
| `pino-logger.config.ts` | pino-http options |
| `api-docs.config.ts` | `isApiDocsEnabled`, `booleanFromEnv` |

## Anti-patterns (in THIS repo)

- ❌ `@Get()/@Post()/@Body()` REST handlers — ✅ `@Implement(contract)` + `implement().handler()`
- ❌ class-validator DTOs / `@ApiProperty` — ✅ Zod contract schemas
- ❌ `@InjectRepository`, entities, repositories — ✅ Drizzle `db` in the service
- ❌ `AuthGuard('jwt')`, Passport, JWT strategy — ✅ Better Auth `@Session()`/`@AllowAnonymous()`
- ❌ `throw new NotFoundException()` inside a handler — ✅ `throw new ORPCError("NOT_FOUND", ...)`
- ❌ `console.*` — ✅ injected pino `Logger`
- ❌ `nest g` — ✅ hand-write from templates; `pnpm -F @repo/backend ...`
- ❌ ownership by fetch-then-compare — ✅ scope in the `where` clause (TOCTOU/existence leak)
