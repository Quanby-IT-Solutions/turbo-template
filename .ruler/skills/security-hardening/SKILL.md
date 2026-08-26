---
name: security-hardening
description: Security patterns and hardening practices for this monorepo. Use when implementing authentication, configuring CORS, validating input, handling secrets, securing API endpoints, or reviewing code for vulnerabilities. Triggers on tasks involving security, auth guards, env validation, CORS, CSP, rate limiting, or OWASP compliance.
frameworks:
  - nestjs
  - nextjs
  - better-auth
  - zod
languages:
  - typescript
category: security
updated: 2026-08-15
---

# Security Hardening

## Quick Reference

| Layer              | Mechanism                                 | Location                                                   |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------- |
| Input validation   | Zod schemas via oRPC contracts            | `packages/contracts/`                                      |
| Request validation | `ZodValidationPipe` (global)              | `apps/backend/src/app.module.ts`                           |
| Serialization      | `ZodSerializerInterceptor` (global)       | `apps/backend/src/app.module.ts`                           |
| Auth               | Better Auth cookie sessions               | `packages/auth/`, backend middleware                       |
| CORS               | Origin whitelist from env                 | `apps/backend/src/config/app.config.ts`                    |
| Env validation     | `@t3-oss/env-core` / `@t3-oss/env-nextjs` | `apps/backend/src/config/env.config.ts`, `apps/web/env.ts` |
| Error masking      | `HttpExceptionFilter` + `SentryExceptionFilter` | `apps/backend/src/common/filters/`                   |
| Rate limiting      | Throttler (Redis, fail-open)              | `apps/backend/src/app.module.ts`, `common/redis/resilient-throttler.storage.ts` |
| Authorization      | `RbacGuard` (global) + `@RequirePermissions` | `apps/backend/src/shared/guards/rbac.guard.ts`          |
| Security headers   | Helmet CSP/HSTS                           | `apps/backend/src/config/security-headers.config.ts`       |
| Body-size limit    | `MAX_REQUEST_BODY_SIZE` (100kb)           | `apps/backend/src/config/app.config.ts`                    |
| Error monitoring   | Sentry (gated, 5xx only)                  | `apps/backend/src/instrument.ts`                           |

## Environment Validation (Fail-Fast)

### Backend (`apps/backend/src/config/env.config.ts`)

```typescript
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import { authSecretSchema } from "@repo/auth/secret-schema"

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		PORT: z.coerce.number().int().positive().default(3000),
		CORS_ORIGINS: z.string(),
		DATABASE_URL: z.string(),
		// Fail-closed: ≥32 chars, no template placeholders. SAME schema the
		// @repo/auth package uses, so the two processes never disagree on what
		// signs a session.
		BETTER_AUTH_SECRET: authSecretSchema,
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
		// ...THROTTLE_*, TRUST_PROXY, ENABLE_HSTS, SENTRY_*, REDIS_* — see env-risk table
	},
	runtimeEnv: process.env,
	// NOT `!!process.env.CI`: CI is exactly where misconfiguration must fail the
	// build. Only the documented escape hatch and lint are exempt.
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" || process.env.npm_lifecycle_event === "lint",
})
```

### Web (`apps/web/env.ts`)

```typescript
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4" // note: zod/v4 — `z.url()`, not `z.string().url()`

export const env = createEnv({
	// Available on both client and server
	shared: {
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	},
	// Server-only, never exposed to the browser
	server: {
		INTERNAL_API_BASE_URL: z.url().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),
		// ...other server-only vars
	},
	// Exposed to the browser (NEXT_PUBLIC_*). Public URLs carry safe defaults.
	client: {
		NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3001"),
		NEXT_PUBLIC_API_BASE_URL: z.url().default("http://localhost:3000/api"),
		NEXT_PUBLIC_API_VERSION: z.string().default("v1"),
	},
	runtimeEnv: {
		/* map each key back to process.env.* */
	},
	// Never skipped just because CI is set — CI is where misconfig must fail.
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" || process.env.npm_lifecycle_event === "lint",
})
```

**Rules:**

- Backend validates at **runtime startup** — crash immediately if vars missing
- Web validates at **build time** — fail the build if vars missing
- Validation is skipped **only** when `SKIP_ENV_VALIDATION === "true"` (documented
  escape hatch) or `npm_lifecycle_event === "lint"`. It is **not** skipped for CI —
  CI is exactly where misconfiguration must fail the build.
- Always validate with Zod schemas (`z.url()`, `z.string()`, `z.enum()`)

## CORS Configuration

```typescript
// apps/backend/src/config/app.config.ts
import { parseOriginList } from "@repo/auth"

export function configureCors(app: INestApplication): void {
	// SAME parser @repo/auth uses for trustedOrigins, so the two allowlists
	// cannot drift. Trims AND drops empties (a trailing comma no longer yields
	// an empty origin that some checks treat as "any").
	const origins = parseOriginList(env.CORS_ORIGINS)
	app.enableCors({
		origin: origins, // Whitelist from env, NOT "*"
		credentials: true, // Allow cookies (required for Better Auth)
		exposedHeaders: ["Retry-After", "X-Retry-After", "X-Request-Id"],
	})
}
```

**Rules:**

- Never use `origin: "*"` — always whitelist specific origins
- `credentials: true` is required for cookie-based auth to work cross-origin
- Use `parseOriginList`, not a raw `.split(",")`, so CORS and auth stay in lockstep
- `exposedHeaders` lets the browser read `Retry-After` (429s) and `X-Request-Id`
- Must run BEFORE Better Auth middleware so auth routes get CORS + OPTIONS handling

## Authentication Security

### Cookie-Based Sessions

Better Auth uses HTTP-only cookies (`better-auth.session_token`):

```typescript
// OpenAPI security scheme declaration
securitySchemes: {
  cookieAuth: {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token"
  }
}
```

### Session Injection in Controllers

```typescript
@Implement(v1.example.todo.create)
async createTodo(@Session() session: UserSession) {
  // session.user.id is verified by Better Auth middleware
  return implement(v1.example.todo.create).handler(async ({ input }) => {
    return this.todosService.create({
      payload: input,
      authorId: session.user.id,  // Always use session, never trust client input
    })
  })
}
```

**Rules:**

- Never accept `userId` or `authorId` from request body — always extract from session
- `@Session()` decorator throws if no valid session cookie exists
- Trusted origins list prevents CSRF: `BETTER_AUTH_TRUSTED_ORIGINS`

### Frontend Cookie Forwarding

```typescript
// Server-side fetch with cookie forwarding
fetch: async (url, init) => {
	return fetch(url, {
		...init,
		headers,
		credentials: "include", // Include cookies in cross-origin requests
		...(isServer
			? {
					cache: "no-store", // Never cache authenticated responses
					next: { revalidate: 0 },
				}
			: {}),
	})
}
```

## Input Validation

### Global Validation Pipeline

```typescript
// apps/backend/src/app.module.ts
providers: [
	{ provide: APP_PIPE, useClass: ZodValidationPipe }, // Validate input
	{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }, // Validate output
	{ provide: APP_FILTER, useClass: HttpExceptionFilter }, // Mask errors
]
```

### Contract-Based Validation

All input validation happens through oRPC contracts with Zod schemas:

```typescript
// packages/contracts/src/modules/v1/[feature]/[feature].schema.ts
export const CreateTodoSchema = z.object({
	title: z.string().min(1).max(255), // Length bounds
	completed: z.boolean().default(false), // Type enforcement
})
```

**Rules:**

- Define validation in contracts, not in controllers or services
- Always set `.min()` and `.max()` for strings
- Use `.int().positive()` for IDs
- Use `.email()` for email fields
- Use `.url()` for URL fields
- Never trust raw `req.body` — always go through contract validation

### Validation Error Response Format

When validation fails, the `HttpExceptionFilter` returns:

```json
{
	"success": false,
	"error": {
		"code": "BadRequestException",
		"message": ["title: String must contain at least 1 character"]
	},
	"timestamp": "2025-07-12T00:00:00.000Z"
}
```

`details` is included **only** when the exception response carries extra fields
beyond `message`/`statusCode`/`error`; it is omitted entirely otherwise.

## Error Masking

The `HttpExceptionFilter` ensures internal errors never leak to clients:

```typescript
// Only catches HttpException (not raw Error)
// Strips internal details
// Returns consistent error format
// Logs ZodSerializationException details via injected pino Logger (not response)
```

**Rules:**

- Never throw raw `Error` — always wrap in `HttpException` or subclass
- Never include stack traces in responses
- Log full error details server-side, return safe messages client-side
- Use appropriate HTTP status codes (400, 401, 403, 404, 500)

## Rate Limiting (Throttler)

Two named limiters in `app.module.ts`, counters in Redis when `REDIS_URL` is set
(so a limit of N is N cluster-wide, not N per instance):

- `default` — `THROTTLE_LIMIT` per `THROTTLE_TTL` (100 / 60s), applies to all routes.
- `strict` — `THROTTLE_STRICT_LIMIT` per `THROTTLE_STRICT_TTL` (10 / 60s),
  **opt-in only** via `@StrictThrottle()` on mutating handlers. A `skipIf`
  predicate skips it everywhere else, so exhausting the strict quota on a write
  never 429s unrelated reads.

```typescript
@StrictThrottle() // shared/decorators/strict-throttle.decorator.ts
@RequirePermissions("posts:create")
@Implement(v1.example.todo.create)
async createTodo(@Session() session: UserSession) { /* ... */ }
```

**Fail-OPEN degradation.** `ResilientThrottlerStorage`
(`common/redis/resilient-throttler.storage.ts`) wraps the Redis store: if Redis
is unreachable it returns `{ totalHits: 0, isBlocked: false }` so requests are
ALLOWED (logged once). The throttler is a supporting abuse control — a Redis
outage must not become a total outage. This is deliberately the OPPOSITE of the
RBAC cache (fail-closed), because that one guards correctness.

## Authorization (RBAC)

`RbacGuard` is registered globally (`APP_GUARD`) and inert unless a handler/class
carries `@RequirePermissions(...names)`
(`shared/decorators/require-permissions.decorator.ts`). AND semantics — the
caller must hold every listed permission.

```typescript
@RequirePermissions("posts:edit") // RbacGuard enforces; RbacService fails closed on unknown names
```

- The guard resolves the session itself (via `getAuth().api.getSession`) rather
  than trusting global-guard ordering, then fails closed (401) if unresolved,
  403 if permissions are missing. Denials are audited.
- `RbacCacheService` (`common/rbac/rbac-cache.service.ts`) caches resolved
  permission sets in Redis (60s TTL). **Fail-CLOSED**: when Redis is unavailable
  every read misses and the caller recomputes from the DB — serving permissions
  from a store you can no longer invalidate is how revoked access survives.
  Invalidation failures are escalated (thrown), not swallowed.

## Security Headers (Helmet)

`buildHelmetOptions()` (`config/security-headers.config.ts`) — NestJS owns
headers on API (JSON) responses; Next.js owns page headers; Nginx only fills in
for its own error pages. Duplicated headers are worse than absent (a doubled CSP
is intersected by the browser).

```typescript
contentSecurityPolicy: {
  useDefaults: false,
  directives: {
    "default-src": ["'none'"], // an API loads nothing
    "frame-ancestors": ["'none'"], // clickjacking
    "base-uri": ["'none'"],
    "form-action": ["'none'"],
  },
},
frameguard: { action: "deny" },
noSniff: true,
referrerPolicy: { policy: "strict-origin-when-cross-origin" },
// HSTS is a promise the browser remembers — gated behind ENABLE_HSTS so it stays
// OFF until TLS actually terminates in the target env (max-age can't be withdrawn).
hsts: env.ENABLE_HSTS ? { maxAge: 31_536_000, includeSubDomains: true, preload: false } : false,
```

## Proxy Trust (TRUST_PROXY)

`TRUST_PROXY` (default `1`) is the number of trusted reverse-proxy hops.
`ThrottlerProxyGuard` keys rate limits on the resulting client IP. It MUST match
the real topology and stay in lockstep with `nginx.conf`:
- `1` = the shipped single-Nginx setup (Nginx overwrites `X-Forwarded-For`).
- `0` = backend directly internet-exposed (socket peer used).
- Setting it HIGHER than reality lets a caller mint a fresh rate-limit bucket per
  request by writing `X-Forwarded-For`.

## Request Body Size

`MAX_REQUEST_BODY_SIZE = "100kb"` (`config/app.config.ts`) caps both JSON and
urlencoded parsers. Both were unbounded — a memory-exhaustion path on every
mutation route. Nginx caps at `1m` (it counts the whole request) so oversized
junk dies at the edge while borderline bodies get a coherent 413 from the app.

## Error Monitoring (Sentry)

Reporting is OFF unless BOTH `SENTRY_ENABLED=true` AND `SENTRY_DSN` are set.
`HttpExceptionFilter` captures **5xx only** (4xx are expected outcomes);
`SentryExceptionFilter` captures everything else. SDK init lives in
`src/instrument.ts`, which reads raw `process.env` and never imports the fail-fast
env config. See the error-handling-logging skill.

## Network Security (AWS)

### Security Group Rules

```
ALB SG:
  Inbound: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0
  Outbound: All

Web ECS SG:
  Inbound: 3001 from ALB SG only
  Outbound: All

Backend ECS SG:
  Inbound: 3000 from ALB SG only
  Outbound: All
```

**Rules:**

- ECS tasks are in private subnets (no public IP)
- Only ALB can reach ECS services (SG-to-SG reference)
- Outbound allowed for external API calls and database connections

## Secret Management

### Environment Variables by Risk Level

| Risk       | Where                | Example                                                       |
| ---------- | -------------------- | ------------------------------------------------------------- |
| Public     | GitHub Variables     | `NEXT_PUBLIC_APP_URL`, `AWS_REGION`, `PROJECT_NAME`           |
| Secret     | GitHub Secrets       | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `REDIS_PASSWORD`        |
| Build-time | Docker ARG           | `NEXT_PUBLIC_API_BASE_URL` (baked into JS bundle)             |
| Runtime    | ECS env / Docker env | `DATABASE_URL`, `CORS_ORIGINS`, `REDIS_URL`                   |

### Security-Relevant Env Reference

| Var | Default | Security note |
|-----|---------|---------------|
| `BETTER_AUTH_SECRET` | — (required) | `authSecretSchema`: ≥32 chars, no placeholders. **Fail-closed** at boot (`packages/auth/src/secret-schema.ts`) |
| `BETTER_AUTH_COOKIE_DOMAIN` | unset (host-only cookie) | any set value widens cookie scope to subdomains — validated by `cookie-domain-schema` |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | `60000` / `100` | default limiter window/limit |
| `THROTTLE_STRICT_TTL` / `THROTTLE_STRICT_LIMIT` | `60000` / `10` | strict limiter (opt-in via `@StrictThrottle()`) |
| `TRUST_PROXY` | `1` | trusted proxy hops; too high re-opens rate-limit bypass (RF2) |
| `ENABLE_HSTS` | `false` | keep off until TLS terminates in target env |
| `REDIS_URL` | unset | throttle counters + RBAC cache; optional single-instance, required multi-instance |
| `REDIS_KEY_PREFIX` | `turbo-template` | isolates environments sharing one Redis |
| `REDIS_PASSWORD` | — (required in compose) | `requirepass`; no default so an unauth'd Redis can't be reachable |
| `SENTRY_ENABLED` | `false` | must be true AND `SENTRY_DSN` set to report |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `SENTRY_TRACES_SAMPLE_RATE` | — / `NODE_ENV` / `0` | tracing opt-in |
| `LOG_LEVEL` | `info` | pino level |
| `ENABLE_API_DOCS` | env-aware (on in dev) | gates Scalar UI + auth `/reference` debug surface |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | — / — / — / — / `false` | mailer; prod without `SMTP_HOST` throws |
| `MAIL_FROM` | `"Dev Mailer" <no-reply@localhost>` | |
| `APP_WEB_URL` | `http://localhost:3001` | base for verification/reset links |
| `EMAIL_VERIFICATION_ENABLED` / `EMAIL_VERIFICATION_REQUIRED` | `true` / `true` | required forces sending on |
| `AUTH_RATE_LIMIT_WINDOW` / `AUTH_RATE_LIMIT_MAX` | `60` / `10` | credential routes; `/get-session` overridden to 500 |

**Rules:**

- Never commit secrets to `.env` files (only `.env.example` with placeholder values)
- Use GitHub Secrets for anything sensitive
- `BETTER_AUTH_SECRET` ≥32 chars is now ENFORCED fail-closed — boot aborts on a
  weak or placeholder value; it is no longer a soft convention
- Rotate secrets regularly

## Security Checklist for New Features

1. [ ] Input validated via Zod schema in contract
2. [ ] Auth: endpoints require a session by default; add `@AllowAnonymous()` ONLY for true public routes
3. [ ] Privileged routes carry `@RequirePermissions(...)` (RbacGuard, AND semantics)
4. [ ] User ID from `@Session()`, never request body; ownership scoped in the `where` clause
5. [ ] Mutations use `@StrictThrottle()` + `IdempotencyInterceptor` where appropriate
6. [ ] CORS via `parseOriginList`, not `.split(",")`
7. [ ] Handlers/services throw `ORPCError`, not Nest HTTP exceptions
8. [ ] Error responses don't leak internals; driver messages logged not returned
9. [ ] Secrets in GitHub Secrets, not env files or code; `BETTER_AUTH_SECRET` ≥32
10. [ ] Database queries use parameterized values (Drizzle handles this); no dynamic SQL
