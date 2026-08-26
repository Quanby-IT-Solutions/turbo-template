---
name: NestJS Validation Pipeline
version: 2.0.0
description: How request/response validation actually works in this backend — Zod contracts, global ZodValidationPipe and ZodSerializerInterceptor. Replaces the old class-validator/DTO model, which this repo does not use.
updated: 2026-08-15
---

# Validation Pipeline (this repo)

There are NO class-validator DTOs, no `@ApiProperty`, no `@Body(ValidationPipe)`.
Validation is contract-driven with Zod and two global providers.

## The two global providers (`app.module.ts`)

```typescript
{ provide: APP_PIPE, useClass: ZodValidationPipe }          // from nestjs-zod — validates INPUT
{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor } // validates/serializes OUTPUT
```

- **Input**: the oRPC contract's `.input(schema)` is enforced. A malformed body,
  query, or path param is rejected before the handler runs.
- **Output**: the contract's `.output(schema)` is enforced on the returned value.
  A shape that doesn't match raises `ZodSerializationException` (surfaced by
  `HttpExceptionFilter`, which also logs the Zod issue tree).

Controllers therefore never call a validation pipe themselves, and services never
re-validate — the schema is the single source of truth.

## Where schemas live

`packages/contracts/src/modules/v1/[feature]/[feature].schema.ts` — plain Zod, no
`@orpc` import. Derive input schemas from a base via `.pick()`/`.partial()`/
`.extend()`. See the `orpc-contracts` skill for the full flow.

```typescript
export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  completed: z.boolean().default(false),
  authorId: z.string(),
  createdAt: z.union([z.date(), z.string()]).transform(v => typeof v === "string" ? new Date(v) : v),
  updatedAt: z.union([z.date(), z.string()]).transform(v => typeof v === "string" ? new Date(v) : v),
})
export const CreateTodoSchema = TodoSchema.pick({ title: true, completed: true })
export const TodoIdSchema = z.object({ id: z.coerce.number().int().positive() }) // coerce path param
```

## Contract binds schema to route

```typescript
create: oc
  .route({ method: "POST", path: "/todos", summary: "Create todo", tags: ["Todos"] })
  .input(CreateTodoSchema)
  .output(TodoSchema),
```

## Service types come FROM the contract

```typescript
import { type V1Inputs } from "@/config/contract-types"
type CreateTodoInput = V1Inputs["example"]["todo"]["create"]
```

`V1Inputs` / `V1Outputs` are inferred from `v1Contract` via
`InferContractRouterInputs`/`Outputs`. Never hand-write a request/response
interface — infer it, so schema and types cannot drift.

## Validation rules (authoring)

- Bound every string: `.min()` / `.max()`.
- IDs: `.int().positive()`; coerce path/query params with `z.coerce.number()`.
- `.email()`, `.url()` where applicable.
- Defaults in the schema (`.default(false)`), not in the service signature.
- Custom messages become the client-facing error text (via `HttpExceptionFilter`).

## Error response shape

A validation failure is rendered by `HttpExceptionFilter` as:

```json
{
  "success": false,
  "error": { "code": "BadRequestException", "message": ["title: ..."], "details": {} },
  "timestamp": "2026-08-15T00:00:00.000Z"
}
```

## Boundaries validation does NOT cover

- Authorization — `RbacGuard` + `@RequirePermissions` (separate concern).
- Ownership — enforced in the Drizzle `where` clause, not by a schema.
- Auth presence — Better Auth / `@AllowAnonymous`.

See: `orpc-contracts` (schema→contract→types), `drizzle-postgres` (storage),
`error-handling-logging` (how failures are rendered/logged).
