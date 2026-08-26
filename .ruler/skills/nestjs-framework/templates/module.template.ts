// TEMPLATE: feature module for this repo.
// Placeholders: {{EntityName}} Pascal, {{entity-name}} kebab.
// Model: apps/backend/src/modules/v1/examples/todos/todos.module.ts
//
// Register this module in apps/backend/src/modules/v1/v1.module.ts.
// No TypeOrmModule.forFeature — Drizzle uses the shared `db` singleton.
import { Module } from "@nestjs/common"

import { IdempotencyInterceptor } from "@/shared/interceptors/idempotency.interceptor"

import { {{EntityName}}Controller } from "./{{entity-name}}.controller"
import { {{EntityName}}Service } from "./{{entity-name}}.service"

@Module({
  controllers: [{{EntityName}}Controller],
  // IdempotencyInterceptor only needed if a handler uses @UseInterceptors(IdempotencyInterceptor).
  providers: [{{EntityName}}Service, IdempotencyInterceptor],
})
export class {{EntityName}}Module {}
