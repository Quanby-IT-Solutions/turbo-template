# NestJS Template Testing Results

**Test Date**: 2026-08-15
**Test Entity**: Product
**Total Templates**: 6
**Stack**: oRPC (contract-first) + Drizzle + Better Auth — matches `apps/backend`.

## Test Summary

| Template | Status | Notes |
|----------|--------|-------|
| controller.template.ts | PASS | `@Implement` + `implement().handler()`, `@AllowAnonymous`/`@Session`/`@RequirePermissions`/`@StrictThrottle` |
| service.template.ts | PASS | Drizzle `db` queries, `ORPCError`, ownership in the `where` clause |
| contract.template.ts | PASS | Zod schema + oRPC `oc.route().input().output()` |
| table.template.ts | PASS | `createTable` + `.$type<>()` typed-enum column |
| module.template.ts | PASS | plain `@Module`, no `TypeOrmModule.forFeature` |
| service.spec.template.ts | PASS | mocks schema/oRPC/auth/db, exercises real controller+service |

**Final Score**: 6/6 templates validated (100%).

## What the harness checks

`node test-templates.js` replaces `{{placeholders}}` with a `Product` fixture, then
validates each generated file for:

1. **Placeholder replacement** — every `{{...}}` substituted (`{{EntityName}}`→`Product`,
   `{{entityName}}`→`product`, `{{entity-name}}`→`product`, `{{table-name}}`→`products`,
   `{{endpoint-path}}`→`products`).
2. **Balanced braces/parens/brackets** and presence of `export`.
3. **Expected imports** per template — e.g. controller imports `@orpc/nest`,
   `@orpc/server`, `@thallesp/nestjs-better-auth`; service imports `drizzle-orm`,
   `@repo/db/schema`; contract imports `zod`, `@orpc/contract`.
4. **Expected markers** — controller: `@Implement`/`@AllowAnonymous`/`@Session`/
   `@RequirePermissions`/`@StrictThrottle`; service: `ORPCError`/`db.select`/`.returning(`;
   contract: `.route(`/`.input(`/`.output(`; table: `createTable`/`.$type<`.
5. **Naming conventions** — `{{EntityName}}Controller`/`Service`/`Module`.

## Deliberately NOT generated

No entity, repository, or DTO templates — this repo has no TypeORM entities, no
repository layer, and no class-validator DTOs. Validation is Zod-via-contract
(see VALIDATION.md); storage is the Drizzle `db` singleton (see the
drizzle-postgres skill).

## Usage

```bash
node .ruler/skills/nestjs-framework/templates/test-templates.js
```

Real modules are still hand-written from these templates and placed under
`apps/backend/src/modules/v1/[feature]/` — there is no `nest g` in this repo.
