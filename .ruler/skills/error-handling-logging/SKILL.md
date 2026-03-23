---
name: error-handling-logging
description: Error handling, logging, and observability patterns for this monorepo. Use when implementing exception filters, error boundaries, structured logging, CloudWatch integration, or health checks. Triggers on tasks involving error responses, exception handling, log formats, monitoring, health endpoints, or observability.
frameworks:
  - nestjs
  - nextjs
  - cloudwatch
languages:
  - typescript
category: observability
updated: 2025-07-12
---

# Error Handling & Logging

## Quick Reference

| Layer | Error Handling | Location |
|-------|---------------|----------|
| Backend global | `HttpExceptionFilter` | `apps/backend/src/common/filters/http-exception.filter.ts` |
| Backend validation | `ZodValidationPipe` | `apps/backend/src/app.module.ts` (APP_PIPE) |
| Backend serialization | `ZodSerializerInterceptor` | `apps/backend/src/app.module.ts` (APP_INTERCEPTOR) |
| Frontend queries | TanStack Query error states | Per-feature query hooks |
| Frontend forms | TanStack Form `field.state.meta.errors` | Per-feature form components |
| Production logs | CloudWatch Logs | `/ecs/{PROJECT_NAME}-{service}` |
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

### Error Response Construction

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()

    // Extract message from various formats
    let message: string | string[]
    if (typeof exceptionResponse === "string") {
      message = exceptionResponse
    } else if (typeof exceptionResponse === "object") {
      const resp = exceptionResponse as Record<string, unknown>
      message = (resp.message as string | string[]) ?? exception.message
    }

    // Log Zod serialization errors (internal diagnostics)
    if (exception instanceof ZodSerializationException) {
      console.error("Zod serialization error:", exception.getZodError())
    }

    response.status(status).json({
      success: false,
      error: {
        code: exception.constructor.name,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
    })
  }
}
```

### Common Error Patterns

```typescript
// 400 - Bad Request (auto from ZodValidationPipe)
// No manual throw needed — contract validation handles this

// 404 - Not Found
throw new NotFoundException(`Todo with id ${id} not found`)

// 401 - Unauthorized (auto from @Session() if no session)
// No manual throw needed — Better Auth handles this

// 403 - Forbidden
throw new ForbiddenException("You do not have permission to delete this resource")

// 409 - Conflict
throw new ConflictException("A todo with this title already exists")

// 500 - Internal Server Error
// Let unhandled errors become 500s naturally (NestJS default behavior)
```

### Registering Global Providers

```typescript
// apps/backend/src/app.module.ts
@Module({
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
```

**Order matters:** Pipe runs first (validates input) → Handler runs → Interceptor runs (validates output) → Filter catches any exceptions.

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

**Expected response:**
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "cache": "ok"
  },
  "uptime": 12345,
  "timestamp": "2025-07-12T00:00:00.000Z"
}
```

### Health Check Configuration

| Platform | Endpoint | Interval | Timeout | Retries | Start Period |
|----------|----------|----------|---------|---------|-------------|
| Docker | `localhost:3000/api/v1/health` | 30s | 10s | 3 | 40s |
| ECS | Same | 30s | 10s | 3 | 40s |
| ALB | `/api/v1/health` (200 OK) | 30s | 10s | — | — |

## Production Logging (CloudWatch)

### Log Groups

| Service | Log Group | Retention |
|---------|-----------|-----------|
| Web | `/ecs/{PROJECT_NAME}-web-{environment}` | 7 days |
| Backend | `/ecs/{PROJECT_NAME}-backend-{environment}` | 7 days |

### Log Driver Configuration (ECS)

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/{PROJECT_NAME}-backend-production",
      "awslogs-region": "{AWS_REGION}",
      "awslogs-stream-prefix": "ecs"
    }
  }
}
```

All `console.log`/`console.error` output goes to CloudWatch automatically.

### Structured Logging Best Practices

```typescript
// Good: structured context
console.error("Failed to create todo", {
  userId: session.user.id,
  input: { title: input.title },
  error: error.message,
})

// Bad: unstructured string
console.error("Error: " + error.message)
```

## CloudWatch Alarms

| Alarm | Condition | Action |
|-------|-----------|--------|
| CPU > 80% | 2 periods of 5 min | SNS notification |
| Memory > 80% | 2 periods of 5 min | SNS notification |
| Unhealthy tasks > 0 | 1 period of 60s | SNS notification |
| 5xx errors > 50 | 5 periods of 60s | SNS notification |
| 4xx errors > 100 | 5 periods of 60s | SNS notification |

## Error Handling Rules

1. **Backend: Always use HttpException subclasses** — `NotFoundException`, `BadRequestException`, `ForbiddenException`, etc.
2. **Never expose stack traces** — The filter strips them automatically
3. **Log context, not secrets** — Never log `DATABASE_URL`, session tokens, or passwords
4. **Frontend: Handle all three states** — loading, error, empty for every query
5. **Mutations: Show feedback** — Toast on success, error message on failure
6. **Health checks: Keep lightweight** — Quick DB ping, no heavy operations
7. **Production: Use CloudWatch** — All console output routes to CloudWatch via ECS log driver
