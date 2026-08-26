// TEMPLATE: oRPC contract-first controller for this repo.
// Placeholders: {{EntityName}} Pascal, {{entityName}} camel, {{entity-name}} kebab.
// Model: apps/backend/src/modules/v1/examples/todos/todos.controller.ts
//
// - NO @Get/@Post/@Body. Routes come from the contract via @Implement.
// - NO validation here — global ZodValidationPipe validates against the contract.
// - Public endpoints get @AllowAnonymous(); everything else requires a session.
// - Mutations: @StrictThrottle() + @RequirePermissions(...) + IdempotencyInterceptor.
import { Controller, UseInterceptors } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"
import { IdempotencyInterceptor } from "@/shared/interceptors/idempotency.interceptor"

import { {{EntityName}}Service } from "./{{entity-name}}.service"

@Controller()
export class {{EntityName}}Controller {
  constructor(private readonly {{entityName}}Service: {{EntityName}}Service) {}

  @AllowAnonymous() // remove if this list should require a session
  @Implement(v1.{{entityName}}.list)
  async list{{EntityName}}s() {
    return implement(v1.{{entityName}}.list).handler(async () => {
      return this.{{entityName}}Service.findAll()
    })
  }

  @AllowAnonymous()
  @Implement(v1.{{entityName}}.get)
  async get{{EntityName}}() {
    return implement(v1.{{entityName}}.get).handler(async ({ input }) => {
      return this.{{entityName}}Service.findOne({ id: input.id })
    })
  }

  @StrictThrottle()
  @RequirePermissions("{{entityName}}:create")
  @UseInterceptors(IdempotencyInterceptor)
  @Implement(v1.{{entityName}}.create)
  async create{{EntityName}}(@Session() session: UserSession) {
    return implement(v1.{{entityName}}.create).handler(async ({ input }) => {
      return this.{{entityName}}Service.create({ payload: input, authorId: session.user.id })
    })
  }

  @StrictThrottle()
  @RequirePermissions("{{entityName}}:edit")
  @UseInterceptors(IdempotencyInterceptor)
  @Implement(v1.{{entityName}}.update)
  async update{{EntityName}}(@Session() session: UserSession) {
    return implement(v1.{{entityName}}.update).handler(async ({ input }) => {
      return this.{{entityName}}Service.update({ payload: input, authorId: session.user.id })
    })
  }

  @StrictThrottle()
  @RequirePermissions("{{entityName}}:delete")
  @UseInterceptors(IdempotencyInterceptor)
  @Implement(v1.{{entityName}}.delete)
  async remove{{EntityName}}(@Session() session: UserSession) {
    return implement(v1.{{entityName}}.delete).handler(async ({ input }) => {
      return this.{{entityName}}Service.delete({ id: input.id, authorId: session.user.id })
    })
  }
}
