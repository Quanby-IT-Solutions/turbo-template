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
updated: 2025-07-12
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
| Error masking      | `HttpExceptionFilter`                     | `apps/backend/src/common/filters/`                         |
| Security groups    | ALB → ECS only                            | Managed in turbo-infrastructure repo                       |

## Environment Validation (Fail-Fast)

### Backend (`apps/backend/src/config/env.config.ts`)

```typescript
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		PORT: z.coerce.number().int().positive().default(3000),
		CORS_ORIGINS: z.string(),
		DATABASE_URL: z.string(),
		BETTER_AUTH_SECRET: z.string(),
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})
```

### Web (`apps/web/env.ts`)

```typescript
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
	client: {
		NEXT_PUBLIC_APP_URL: z.string().url(),
		NEXT_PUBLIC_API_BASE_URL: z.string().url(),
		NEXT_PUBLIC_API_VERSION: z.string().default("v1"),
	},
	runtimeEnv: {
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
		NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION,
	},
})
```

**Rules:**

- Backend validates at **runtime startup** — crash immediately if vars missing
- Web validates at **build time** — fail the build if vars missing
- `skipValidation` in CI/lint prevents false failures during linting
- Always validate with Zod schemas (`.url()`, `.string()`, `.enum()`)

## CORS Configuration

```typescript
// apps/backend/src/config/app.config.ts
function configureCors(app: INestApplication): void {
	const origins = env.CORS_ORIGINS.split(",").map(origin => origin.trim())
	app.enableCors({
		origin: origins, // Whitelist from env, NOT "*"
		credentials: true, // Allow cookies (required for Better Auth)
	})
}
```

**Rules:**

- Never use `origin: "*"` — always whitelist specific origins
- `credentials: true` is required for cookie-based auth to work cross-origin
- Origins come from environment variables, not hardcoded

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
		"message": ["title: String must contain at least 1 character"],
		"details": {}
	},
	"timestamp": "2025-07-12T00:00:00.000Z"
}
```

## Error Masking

The `HttpExceptionFilter` ensures internal errors never leak to clients:

```typescript
// Only catches HttpException (not raw Error)
// Strips internal details
// Returns consistent error format
// Logs ZodSerializationException details to console (not response)
```

**Rules:**

- Never throw raw `Error` — always wrap in `HttpException` or subclass
- Never include stack traces in responses
- Log full error details server-side, return safe messages client-side
- Use appropriate HTTP status codes (400, 401, 403, 404, 500)

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
| Secret     | GitHub Secrets       | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `AWS_SECRET_ACCESS_KEY` |
| Build-time | Docker ARG           | `NEXT_PUBLIC_API_BASE_URL` (baked into JS bundle)             |
| Runtime    | ECS env / Docker env | `DATABASE_URL`, `CORS_ORIGINS`                                |

**Rules:**

- Never commit secrets to `.env` files (only `.env.example` with placeholder values)
- Use GitHub Secrets for anything sensitive
- `BETTER_AUTH_SECRET` must be a strong random string (≥32 characters)
- Rotate secrets regularly, especially `AWS_SECRET_ACCESS_KEY`

## Security Checklist for New Features

1. [ ] Input validated via Zod schema in contract
2. [ ] Auth required? Add `@Session()` decorator to controller
3. [ ] User ID from session, not request body
4. [ ] CORS allows only expected origins
5. [ ] Error responses don't leak internals
6. [ ] Secrets in GitHub Secrets, not env files or code
7. [ ] Database queries use parameterized values (Drizzle handles this)
8. [ ] No `eval()`, no dynamic SQL, no string concatenation for queries
9. [ ] File uploads validated for type and size
10. [ ] Rate limiting considered for public endpoints
