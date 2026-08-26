---
name: error-handling-logging
description: Error handling, logging, and observability patterns for this monorepo. Use when implementing exception filters, error boundaries, structured logging, Sentry/pino integration, or health checks. Triggers on tasks involving error responses, exception handling, log formats, monitoring, health endpoints, or observability.
frameworks:
  - nestjs
  - nextjs
  - nestjs-pino
  - sentry
languages:
  - typescript
category: observability
updated: 2026-08-15
---

# Error Handling & Logging

## Quick Reference

| Layer | Error Handling | Location |
|-------|---------------|----------|
| Backend catch-all | `SentryExceptionFilter` (`@Catch()`) | `apps/backend/src/common/filters/sentry-exception.filter.ts` |
| Backend HTTP errors | `HttpExceptionFilter` (`@Catch(HttpException)`) | `apps/backend/src/common/filters/http-exception.filter.ts` |
| Backend validation | `ZodValidationPipe` | `apps/backend/src/app.module.ts` (APP_PIPE) |
| Backend serialization | `ZodSerializerInterceptor` | `apps/backend/src/app.module.ts` (APP_INTERCEPTOR) |
| Handler/service errors | `ORPCError` from `@orpc/server` | inside `implement().handler()` |
| Structured logging | `nestjs-pino` (pino-http) | `apps/backend/src/config/pino-logger.config.ts` |
| Log redaction | `@repo/observability` + `utils/log-redaction.ts` | request-id + query/token stripping |
| Frontend queries | TanStack Query error states | Per-feature query hooks |
| Frontend forms | TanStack Form `field.state.meta.errors` | Per-feature form components |
| Health checks | `/api/v1/health` endpoint | Backend health module |

## Backend Error Handling

### Global Exception Filter

The `HttpExceptionFilter` catches all `HttpException` instances and returns a consistent format:

```typescript
// Response format for ALL errors
{
  "success": false,
  "error": {
    "code": "BadRequestException",        // Exception class name
    "message": "Title is required",       // Human-readable message (string or string[])
    "details": {}                          // Optional extra data
  },
  "timestamp": "2025-07-12T00:00:00.000Z"
}
```

### Two Filters, One Error Shape

Nest routes an exception to the most specific matching filter, so the split is
by exception TYPE, not registration luck:

- `HttpExceptionFilter` — `@Catch(HttpException)`: deliberate, typed errors
  (`ORPCError` maps here too). Renders the real status/message. Captures to
  Sentry **only when `status >= 500`** (4xx RBAC denials, 429s, validation are
  expected outcomes, not incidents).
- `SentryExceptionFilter` — `@Catch()` (catch-all): bugs and driver faults.
  Captures unconditionally, logs the stack via injected pino `Logger`, renders a
  generic 500 in the same `{ success, error, timestamp }` shape.

Because the catch-all never sees `HttpException`, the same error is never
reported twice. The Logger is the injectable `nestjs-pino` `Logger` (DI), NOT
`console`.

```typescript
// apps/backend/src/common/filters/http-exception.filter.ts
import { Logger } from "nestjs-pino"
import { ZodSerializationException } from "nestjs-zod"

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {} // injected, never `new`-ed

  catch(exception: HttpException, host: ArgumentsHost) {
    const status = exception.getStatus()
    if (status >= 500) Sentry.captureException(exception) // 5xx only

    // pino-http is the authoritative request logger; only emit the EXTRA detail
    // it can't carry (the Zod issue tree).
    if (exception instanceof ZodSerializationException) {
      this.logger.error({ err: exception.getZodError() }, "ZodSerializationException")
    }
    // ... renders { success, error: { code, message, details? }, timestamp }
    // Any Retry-After header set by the throttler before throwing passes through.
  }
}
```

### Common Error Patterns

Inside `implement().handler()` and services, throw `ORPCError` from
`@orpc/server` — NOT `NotFoundException`/`HttpException`. oRPC swallows Nest HTTP
exceptions and returns a generic 500, losing the real status. (Guards run
OUTSIDE the handler, so `RbacGuard` throwing `ForbiddenException` is fine.)
See the orpc-contracts skill for the full mapping.

```typescript
import { ORPCError } from "@orpc/server"

// 400 validation — usually automatic via ZodValidationPipe; no manual throw
if (!role) throw new ORPCError("NOT_FOUND", { message: `Role ${id} not found` })   // 404
if (existing) throw new ORPCError("CONFLICT", { message: "Name taken" })            // 409
if (isProtected) throw new ORPCError("FORBIDDEN", { message: "Cannot delete" })     // 403
// Unexpected throws (driver faults, bugs) → SentryExceptionFilter renders 500
```

### Registering Global Providers

```typescript
// apps/backend/src/app.module.ts
@Module({
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    // Catch-all registered FIRST (per Sentry's Nest setup guidance)...
    { provide: APP_FILTER, useClass: SentryExceptionFilter },
    // ...then the specific one. Type precedence, not order, decides routing.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

**Order matters:** Pipe runs first (validates input) → Handler runs → Interceptor runs (validates output) → Filters catch any exceptions.

### Structured Logging (nestjs-pino)

`buildPinoHttpOptions()` (`config/pino-logger.config.ts`) configures ONE pino-http
options object shared by the injectable Nest `Logger` and the standalone Express
middleware registered before Better Auth (the authoritative request/response
logger; `LoggerModule` runs with `autoLogging: false` to avoid double lines).

- **Redaction:** `PINO_REDACT_PATHS` from `@repo/observability` with `remove: true`
  (values deleted, not masked). Query strings and `?token=` links are stripped
  via `sanitizeLogUrl` / `sanitizeLogQuery`.
- **Request-id correlation:** `genReqId` reuses an existing `req.id`, else honours
  a sanitized inbound `X-Request-Id` (`sanitizeRequestId`: allowlist charset, max
  64 chars — a newline/control char would forge log lines), else a fresh UUID.
  The id is echoed back on the `X-Request-Id` response header.

## Frontend Error Handling

### Query Error States

```tsx
import { useTodosQuery } from "@/features/todos/api/todos.hooks"
import { Alert, AlertDescription } from "@/core/components/ui/alert"

export function TodosList() {
  const { data: todos, isLoading, error } = useTodosQuery()

  if (isLoading) {
    return <Spinner />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load todos. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  if (!todos?.length) {
    return <p className="text-muted-foreground">No todos yet.</p>
  }

  return <ul>{todos.map(todo => <TodoCard key={todo.id} todo={todo} />)}</ul>
}
```

**Pattern:** Always handle three states: loading, error, and empty data.

### Mutation Error Handling

```tsx
const createMutation = useCreateTodoMutation()

async function handleSubmit(data: CreateTodoInput) {
  try {
    await createMutation.mutateAsync(data)
    toast.success("Todo created!")
  } catch (error) {
    toast.error("Failed to create todo. Please try again.")
  }
}

// Or declarative:
<Button disabled={createMutation.isPending}>
  {createMutation.isPending ? "Creating..." : "Create"}
</Button>
{createMutation.error && (
  <p className="text-destructive text-sm">
    {createMutation.error.message}
  </p>
)}
```

### Form Validation Errors

TanStack Form surfaces validation errors per field:

```tsx
<form.Field name="title">
  {(field) => (
    <div>
      <Input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.errors?.length > 0 && (
        <p className="text-destructive text-sm">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </div>
  )}
</form.Field>
```

## Health Checks

### Backend Health Endpoint

The `/api/v1/health` endpoint is critical for:
- Docker HEALTHCHECK directives
- ECS task health monitoring
- ALB target group health checks

**Actual response** (`modules/v1/health/health.service.ts`) — deliberately
carries NO uptime/version/environment (those leak deploy timing and build info to
anonymous probers), and there is NO cache check:
```json
{
  "status": "ok",
  "timestamp": "2026-08-15T00:00:00.000Z",
  "checks": { "database": { "status": "up" } }
}
```
`status` is `"ok"` when the DB check is `"up"`, else `"error"`. A failed DB check
returns `{ status: "down", message: "database check failed" }` — the driver's real
message (host/port/user) is logged, never returned. The endpoint is public via
`@AllowAnonymous()` on the controller.

### Health Check Configuration

| Platform | Endpoint | Interval | Timeout | Retries | Start Period |
|----------|----------|----------|---------|---------|-------------|
| Docker | `localhost:3000/api/v1/health` | 30s | 10s | 3 | 40s |
| ECS | Same | 30s | 10s | 3 | 40s |
| ALB | `/api/v1/health` (200 OK) | 30s | 10s | — | — |

## Error Monitoring (Sentry)

The Sentry SDK is initialised in `src/instrument.ts` BEFORE `AppModule` (so it
sits ahead of the libraries it instruments). That file reads Sentry keys off raw
`process.env` — it deliberately does NOT import `env.config.ts`, to keep
fail-fast validation of one unrelated var from killing the crash reporter.

Reporting stays OFF unless BOTH `SENTRY_ENABLED=true` AND `SENTRY_DSN` are set —
a flag without a DSN is an unfinished deploy, a DSN without the flag is a value
parked for later. `Sentry.captureException` is a no-op when `init` never ran, so
the disabled path needs no branch.

| Var | Default | Notes |
|-----|---------|-------|
| `SENTRY_ENABLED` | `false` | must be true AND DSN set to report |
| `SENTRY_DSN` | — | |
| `SENTRY_ENVIRONMENT` | falls back to `NODE_ENV` | never merge environments |
| `SENTRY_TRACES_SAMPLE_RATE` | `0` | errors only; tracing is opt-in |
| `IMAGE_TAG` | — | reported as the Sentry release |

## Production Logging

Logs go to stdout as pino JSON (pretty-printed only in development via
`pino-pretty`). Whatever ships stdout to your log sink collects them; nothing in
the app is coupled to a specific provider. `LOG_LEVEL` (default `info`) sets the
pino level.

```typescript
// Good: structured context via the injected pino Logger (constructor DI)
this.logger.error({ userId, input: { title } }, "Failed to create todo")

// Bad: unstructured string, and NOT console.*
console.error("Error: " + error.message)
```

## Error Handling Rules

1. **Inside handlers/services: throw `ORPCError`** — not Nest HTTP exceptions
   (oRPC turns those into a generic 500). Guards may throw Nest exceptions.
2. **Never expose stack traces or driver messages** — the filters render safe
   bodies; SentryExceptionFilter returns a generic 500 message.
3. **Log context, not secrets** — pino redaction removes known-sensitive paths;
   never log `DATABASE_URL`, session tokens, or `?token=` URLs.
4. **Use the injected pino `Logger`, not `console`** — filters/guards/services
   receive it via DI.
5. **Frontend: Handle all three states** — loading, error, empty for every query.
6. **Mutations: Show feedback** — Toast on success, error message on failure.
7. **Health checks: Keep lightweight** — a single `select 1`, no metadata.
