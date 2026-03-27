---
name: orpc-contracts
description: oRPC contract-first API design for this monorepo. Use when creating API endpoints, defining schemas, implementing controllers, building frontend hooks, or working with @repo/contracts, @orpc/contract, @orpc/server, @orpc/nest, or @orpc/client. Triggers on tasks involving API routes, Zod schemas for contracts, type-safe RPC, or end-to-end type safety.
frameworks:
  - orpc
  - nestjs
  - nextjs
languages:
  - typescript
category: api
updated: 2026-03-06
---

# oRPC Contract-First API Design Skill

## Quick Reference

**When to Use**: Creating API endpoints, defining Zod schemas for contracts, implementing backend controllers, or building frontend query hooks

**Key Principle**: Contract-first — define schemas and routes in `@repo/contracts`, then implement on both backend and frontend with full type safety

**Packages**: `@orpc/contract` (schemas), `@orpc/server` + `@orpc/nest` (backend), `@orpc/client` + `@orpc/openapi-client` + `@orpc/tanstack-query` (frontend)

## Complete Flow: Schema → Contract → Implementation → Consumption

```
packages/contracts/src/modules/v1/[feature]/
  ├── [feature].schema.ts     ← 1. Zod schemas (no oRPC dependency)
  └── [feature].contract.ts   ← 2. oRPC route definitions

packages/contracts/src/modules/v1/
  ├── [group]/v1.[group].ts   ← 3. Feature router (groups related contracts)
  └── v1.contract.ts          ← 4. Version router (applies /v1 prefix)

packages/contracts/src/
  ├── contracts.ts             ← 5. Central registry (re-exports)
  └── index.ts                 ← 6. Package entrypoint

apps/backend/src/config/
  ├── api-versions.config.ts   ← 7. Backend alias (v1Contract as v1)
  └── contract-types.ts        ← 8. Type inference (V1Inputs/V1Outputs)

apps/backend/src/modules/v1/[feature]/
  ├── [feature].controller.ts  ← 9. @Implement decorator + implement().handler()
  └── [feature].service.ts     ← 10. Typed service with V1Inputs

apps/web/
  ├── services/orpc/client.ts  ← 11. OpenAPILink + createTanstackQueryUtils
  └── features/[feature]/api/  ← 12. useQuery/useMutation hooks
```

## Layer 1: Schema Definition (`.schema.ts`)

```typescript
// packages/contracts/src/modules/v1/examples/todos/todos.schema.ts
import { z } from "zod"

// Base schema — represents the full resource
export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  completed: z.boolean().default(false),
  authorId: z.string(),
  createdAt: z.union([z.date(), z.string()]).transform(val =>
    typeof val === "string" ? new Date(val) : val
  ),
  updatedAt: z.union([z.date(), z.string()]).transform(val =>
    typeof val === "string" ? new Date(val) : val
  ),
})

// Input schemas — derived from base using .pick() and .partial()
export const CreateTodoSchema = TodoSchema.pick({ title: true, completed: true })
export const UpdateTodoSchema = TodoSchema.pick({ title: true, completed: true }).partial()
export const TodoIdSchema = z.object({ id: z.coerce.number().int().positive() })
export const UpdateTodoRequestSchema = TodoIdSchema.extend(UpdateTodoSchema.shape)

// Inferred TypeScript types
export type Todo = z.infer<typeof TodoSchema>
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>
export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequestSchema>
export type TodoIdInput = z.infer<typeof TodoIdSchema>
```

**Rules:**
- No `@orpc` imports — schemas are framework-agnostic
- Derive input schemas from base using `.pick()`, `.partial()`, `.extend()`
- Export TypeScript types via `z.infer<typeof>`
- Use `.js` extension in relative imports (ESM)

## Layer 2: Contract Definition (`.contract.ts`)

```typescript
// packages/contracts/src/modules/v1/examples/todos/todos.contract.ts
import { oc } from "@orpc/contract"
import { z } from "zod"

import { CreateTodoSchema, TodoIdSchema, TodoSchema, UpdateTodoRequestSchema } from "./todos.schema.js"

export const todoContract = {
  list: oc
    .route({ method: "GET", path: "/todos", summary: "List all todos", tags: ["Todos"] })
    .output(z.array(TodoSchema)),

  get: oc
    .route({ method: "GET", path: "/todos/{id}", summary: "Get todo by ID", tags: ["Todos"] })
    .input(TodoIdSchema)
    .output(TodoSchema),

  create: oc
    .route({ method: "POST", path: "/todos", summary: "Create todo", tags: ["Todos"] })
    .input(CreateTodoSchema)
    .output(TodoSchema),

  update: oc
    .route({ method: "PUT", path: "/todos/{id}", summary: "Update todo", tags: ["Todos"] })
    .input(UpdateTodoRequestSchema)
    .output(TodoSchema),

  delete: oc
    .route({ method: "DELETE", path: "/todos/{id}", summary: "Delete todo", tags: ["Todos"] })
    .input(TodoIdSchema)
    .output(z.object({ success: z.boolean(), id: z.number() })),
}
```

**Rules:**
- Each procedure = one HTTP method + path
- Routes do NOT include `/v1/` prefix (added by version router)
- `{id}` path params are parsed from the input schema
- Include `summary` and `tags` for OpenAPI/Scalar docs
- Use `spec: spec => ({ ...spec, security: [] })` to mark public endpoints

## Layer 3: Feature Router

```typescript
// packages/contracts/src/modules/v1/examples/v1.example.ts
import { oc } from "@orpc/contract"
import { todoContract } from "./todos/todos.contract.js"

export const v1Example = oc.prefix("/example").router(
  oc.router({ todo: todoContract })
)
```

## Layer 4: Version Router

```typescript
// packages/contracts/src/modules/v1/v1.contract.ts
import { oc } from "@orpc/contract"
import { v1Example } from "./examples/v1.example.js"
import { healthContract } from "./health/health.contract.js"

export const v1Contract = oc.prefix("/v1").router(
  oc.router({ health: healthContract, example: v1Example })
)
export type V1Contract = typeof v1Contract
```

## Layer 5-6: Package Export

```typescript
// packages/contracts/src/contracts.ts
export { v1Contract, type V1Contract } from "./modules/v1/v1.contract.js"

// packages/contracts/src/index.ts
export * from "./contracts.js"
```

## Layer 7-8: Backend Config

```typescript
// apps/backend/src/config/api-versions.config.ts
import { v1Contract } from "@repo/contracts"
export { v1Contract as v1 }

// apps/backend/src/config/contract-types.ts
import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract"
import { type v1Contract } from "@repo/contracts"

export type V1Inputs = InferContractRouterInputs<typeof v1Contract>
export type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
```

## Layer 9: Backend Controller

```typescript
// apps/backend/src/modules/v1/examples/todos/todos.controller.ts
import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { TodosService } from "./todos.service"

@Controller()
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Implement(v1.example.todo.list)
  async listTodos() {
    return implement(v1.example.todo.list).handler(async () => {
      return this.todosService.findAll()
    })
  }

  @Implement(v1.example.todo.create)
  async createTodo(@Session() session: UserSession) {
    return implement(v1.example.todo.create).handler(async ({ input }) => {
      return this.todosService.create({ payload: input, authorId: session.user.id })
    })
  }
}
```

**Pattern:**
- `@Implement(v1.path.to.procedure)` — registers route with oRPC
- `implement(v1.path.to.procedure).handler(async ({ input }) => {})` — typed handler
- `@Session()` decorator for authenticated endpoints
- Controller does NOT validate — oRPC validates against contract schemas automatically

## Layer 10: Backend Service

```typescript
// apps/backend/src/modules/v1/examples/todos/todos.service.ts
import { Injectable, NotFoundException } from "@nestjs/common"
import { eq } from "drizzle-orm"
import { todos } from "@repo/db/schema"
import { db } from "@/common/database/database.client"
import { type V1Inputs } from "@/config/contract-types"

type CreateTodoInput = V1Inputs["example"]["todo"]["create"]

@Injectable()
export class TodosService {
  async findAll() {
    return db.select().from(todos)
  }

  async create({ payload, authorId }: { payload: CreateTodoInput; authorId: string }) {
    const [todo] = await db.insert(todos).values({
      title: payload.title,
      completed: payload.completed ?? false,
      authorId,
    }).returning()
    return todo
  }
}
```

**Pattern:**
- Type service inputs from `V1Inputs["path"]["to"]["procedure"]`
- No manual validation — contract handles it
- Direct Drizzle queries with `@repo/db/schema`

## Layer 11: Frontend oRPC Client

```typescript
// apps/web/services/orpc/client.ts
import { createORPCClient } from "@orpc/client"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { v1Contract } from "@repo/contracts"
import { env } from "@/env"

const link = new OpenAPILink(v1Contract, {
  url: env.NEXT_PUBLIC_API_BASE_URL,
  fetch: (url, init) => fetch(url, { ...init, credentials: "include" }),
})

const baseOrpc = createORPCClient(link)
export const orpc = createTanstackQueryUtils(baseOrpc, { path: ["orpc"] })
```

## Layer 12: Frontend Hooks

```typescript
// apps/web/features/todos/api/todos.hooks.ts
"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { orpc } from "@/services/orpc/client"

export function useTodosQuery() {
  return useQuery(orpc.example.todo.list.queryOptions({ staleTime: 60 * 1000 }))
}

export function useCreateTodoMutation() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.example.todo.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.example.todo.key() }),
    })
  )
}
```

**API:**
- `.queryOptions()` — for `useQuery()`, accepts TanStack Query options
- `.mutationOptions()` — for `useMutation()`, accepts TanStack Query options
- `.key()` — cache key for invalidation with `queryClient.invalidateQueries()`

## Adding a New Feature Checklist

1. Create `[feature].schema.ts` in `packages/contracts/src/modules/v1/[group]/[feature]/`
2. Create `[feature].contract.ts` referencing schemas
3. Add to feature router (e.g., `v1.example.ts`) or create new group
4. Add group to version router (`v1.contract.ts`) if new
5. Re-export from `contracts.ts` if new version router
6. Create `[feature].controller.ts` with `@Implement` decorators
7. Create `[feature].service.ts` with `V1Inputs` types
8. Create `[feature].module.ts` and register in `V1Module`
9. Create `[feature].hooks.ts` in `apps/web/features/[feature]/api/`
10. Build UI components using the hooks
