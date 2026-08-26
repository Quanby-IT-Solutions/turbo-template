---
name: NestJS Framework
version: 2.0.0
framework_versions:
  min: 11.0.0
  max: 11.x
  recommended: 11.x
compatible_agents:
  backend-developer: ">=3.0.0"
  tech-lead-orchestrator: ">=2.5.0"
description: This repo's NestJS 11 backend — contract-first oRPC controllers, Drizzle services, Better Auth sessions, and global Zod validation. NOT a generic NestJS guide.
frameworks:
  - nestjs
  - orpc
  - drizzle-orm
  - better-auth
languages:
  - typescript
category: backend
updated: 2026-08-15
---

# NestJS Framework Skill (this repo)

## What this backend actually is

`apps/backend` is NestJS 11, but it does NOT use the conventional NestJS data/DTO
stack. Before writing anything, know what is TRUE here:

| Concern | This repo uses | NOT |
|---------|----------------|-----|
| Routing | oRPC `@Implement(contract)` + `implement().handler()` (one exception below) | `@Get`/`@Post`/`@Body` REST |
| Input/output validation | Zod contracts + global `ZodValidationPipe` / `ZodSerializerInterceptor` | class-validator DTOs, `@ApiProperty` |
| DB access | Drizzle `db` singleton, queried directly in services | TypeORM/`@InjectRepository`, repositories, entities |
| Auth | Better Auth cookie sessions, `@Session()` / `@AllowAnonymous()` | Passport, `AuthGuard('jwt')`, JWT strategy |
| Authorization | `@RequirePermissions()` + global `RbacGuard` | `RolesGuard`/`@Roles` |
| Rate limit | `@nestjs/throttler` v6 + `@StrictThrottle()` | — |
| Errors | `ORPCError` in handlers; `HttpException*Filter`s | `NotFoundException` inside handlers |
| Serialization | `ZodSerializerInterceptor` | `ClassSerializerInterceptor` |
| Codegen | hand-written + templates in this skill | `nest g` |

There is no `nest g`, no entities, no repositories, no DTO classes. See sibling
skills: `orpc-contracts`, `drizzle-postgres`, `better-auth`, `security-hardening`,
`error-handling-logging`, `redis-caching`.

**Routing exception — diagnostics (dev-only):** `modules/v1/diagnostics/diagnostics.controller.ts`
is the one plain-REST controller (`@Controller({ path: "diagnostics", version: "1" })`
with `@Get("sentry")` / `@Post("sentry/test-error")`). It has no contract in
`@repo/contracts` on purpose, and `V1Module` imports `DiagnosticsModule` only when
`NODE_ENV === "development"`, so outside development these routes are not registered
at all. Every other controller uses oRPC `@Implement`.

## Module Structure

```
apps/backend/src/
├── app.module.ts            # root: global pipe/interceptor/filters/guards, throttler, auth, redis
├── main.ts / bootstrap.ts / instrument.ts
├── common/
│   ├── database/database.client.ts   # Drizzle `db` singleton
│   ├── filters/                      # http-exception + sentry-exception
│   ├── redis/                        # provider, module, resilient-throttler storage
│   ├── rbac/ audit/ maintenance/ orpc/
├── config/                  # env.config, app.config, api-versions.config, pino-logger.config, ...
├── shared/
│   ├── decorators/          # require-permissions, strict-throttle
│   ├── guards/              # rbac.guard, throttler-proxy.guard
│   └── interceptors/        # idempotency.interceptor
└── modules/v1/
    ├── health/ me/ rbac/ tickets/ examples/todos/  # feature modules
    ├── diagnostics/         # plain-REST Sentry diagnostics, imported dev-only
    └── v1.module.ts         # imports the feature modules
```

### Feature Module (real: todos)

```typescript
// modules/v1/examples/todos/todos.module.ts
@Module({
  controllers: [TodosController],
  providers: [TodosService, IdempotencyInterceptor],
})
export class TodosModule {}
```

No barrels, co-located files, imports use the `@/` alias.

## Controller — contract-first oRPC

```typescript
// modules/v1/examples/todos/todos.controller.ts
import { Controller, UseInterceptors } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"
import { IdempotencyInterceptor } from "@/shared/interceptors/idempotency.interceptor"
import { TodosService } from "./todos.service"

@Controller() // no path — oRPC derives routes from the contract
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @AllowAnonymous() // public; every non-public route needs a session by default
  @Implement(v1.example.todo.list)
  async listTodos() {
    return implement(v1.example.todo.list).handler(async () => this.todosService.findAll())
  }

  @StrictThrottle()
  @RequirePermissions("posts:create")
  @UseInterceptors(IdempotencyInterceptor)
  @Implement(v1.example.todo.create)
  async createTodo(@Session() session: UserSession) {
    return implement(v1.example.todo.create).handler(async ({ input }) =>
      this.todosService.create({ payload: input, authorId: session.user.id })
    )
  }
}
```

**Rules:**
- `@Implement(contract)` on the method, `implement(contract).handler(...)` returned inside.
- The controller does NOT validate — the global `ZodValidationPipe` validates
  input against the contract, `ZodSerializerInterceptor` validates output.
- `authorId` always comes from `session.user.id`, never from client input.

## Service — Drizzle, direct `db`

```typescript
// modules/v1/examples/todos/todos.service.ts
import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server" // NOT NestJS HTTP exceptions
import { and, desc, eq } from "drizzle-orm"

import { todos } from "@repo/db/schema"
import { db } from "@/common/database/database.client"
import { type V1Inputs } from "@/config/contract-types"

type CreateTodoInput = V1Inputs["example"]["todo"]["create"]

@Injectable()
export class TodosService {
  async findAll() {
    return db.select().from(todos).orderBy(desc(todos.completed), desc(todos.updatedAt))
  }

  async findOne({ id }: { id: number }) {
    const [todo] = await db.select().from(todos).where(eq(todos.id, id))
    if (!todo) throw new ORPCError("NOT_FOUND", { message: `Todo ${id} not found` })
    return todo
  }

  async create({ payload, authorId }: { payload: CreateTodoInput; authorId: string }) {
    const [todo] = await db
      .insert(todos)
      .values({ title: payload.title, completed: payload.completed ?? false, authorId })
      .returning()
    if (!todo) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Todo not created" })
    return todo
  }

  // Ownership is scoped IN the where clause (AZ-3): filter, don't fetch-then-check
  // (that's a TOCTOU and leaks existence). 0 rows → 404, whether missing or not yours.
  async update({ payload, authorId }: { payload: V1Inputs["example"]["todo"]["update"]; authorId: string }) {
    const id = payload.id as number
    const [todo] = await db
      .update(todos)
      .set({ title: payload.title, completed: payload.completed ?? false, updatedAt: new Date() })
      .where(and(eq(todos.id, id), eq(todos.authorId, authorId)))
      .returning()
    if (!todo) throw new ORPCError("NOT_FOUND", { message: `Todo ${id} not found` })
    return todo
  }
}
```

**Rules:**
- Types come from `V1Inputs["path"]["to"]["procedure"]` / `V1Outputs[...]`.
- Import tables from `@repo/db/schema`; query `db` directly — no repository layer.
- Throw `ORPCError` (maps to HTTP status). NestJS HTTP exceptions inside a handler
  become a generic 500. Guards may throw NestJS exceptions (they run outside).

## Root Wiring (`app.module.ts`)

Global providers (registration order matters for the two filters):

```typescript
providers: [
  { provide: APP_PIPE, useClass: ZodValidationPipe },          // validate input
  { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }, // validate output
  { provide: APP_FILTER, useClass: SentryExceptionFilter },    // catch-all, FIRST
  { provide: APP_FILTER, useClass: HttpExceptionFilter },      // @Catch(HttpException)
  { provide: APP_GUARD, useClass: ThrottlerProxyGuard },       // rate limit
  { provide: APP_GUARD, useClass: RbacGuard },                 // @RequirePermissions
]
```

Imports include `SentryModule.forRoot()`, `ConfigModule.forRoot({ load: [() => env] })`,
`LoggerModule.forRoot()` (nestjs-pino), `ThrottlerModule.forRootAsync(...)` (Redis
store), `AuthModule.forRoot({ auth: getAuth(), disableControllers: true })`,
`RedisModule`, `ORPCCommonModule`, `RbacModule`, `AuditModule`, `MaintenanceModule`, `V1Module`.

## Testing

Jest via ts-jest (`pnpm -F @repo/backend test`). Specs mock `@repo/db/schema`,
`@orpc/nest`, `@orpc/server`, `@thallesp/nestjs-better-auth`, and the `db`
singleton, then build a `TestingModule` with the real controller + service. See
`templates/service.spec.template.ts` (modeled on `todos.controller.spec.ts`).
Example modules are excluded from coverage.

## Commands (pnpm + turbo — NO `nest g`)

```bash
pnpm -F @repo/backend dev            # nest start --watch
pnpm -F @repo/backend build          # nest build
pnpm -F @repo/backend test           # jest
pnpm -F @repo/backend lint           # eslint (skips env validation)
pnpm -F @repo/backend typecheck      # tsc --noEmit
pnpm -F @repo/db db:push             # push Drizzle schema (dev)
pnpm -F @repo/db db:generate         # generate migration SQL
```

## Adding a Feature (checklist)

1. Contract + Zod schema in `packages/contracts` (see `orpc-contracts` skill).
2. Register it in `v1.contract.ts`.
3. Drizzle table in `packages/db/src/schema.ts` if new storage (see `drizzle-postgres`).
4. `[feature].service.ts` — Drizzle queries typed from `V1Inputs`/`V1Outputs`.
5. `[feature].controller.ts` — `@Implement` methods; decorate auth/permissions/throttle.
6. `[feature].module.ts`; register in `V1Module`.
7. `[feature].controller.spec.ts` mocking the boundaries.
8. `pnpm -F @repo/backend lint typecheck test`; `db:push` if schema changed.

## See Also

- [REFERENCE.md](./REFERENCE.md) — deeper: guards, filters, throttler, RBAC, idempotency
- [VALIDATION.md](./VALIDATION.md) — Zod validation pipeline specifics
- [templates/](./templates/) — controller/service/module/table/contract/spec templates
- [examples/](./examples/) — Better Auth session guard + contract-first CRUD
