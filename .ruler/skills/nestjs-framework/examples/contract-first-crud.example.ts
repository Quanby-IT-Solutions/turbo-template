/**
 * EXAMPLE: contract-first CRUD in this repo (oRPC + Drizzle + Better Auth).
 *
 * Replaces the old TypeORM/DTO/RBAC-roles CRUD. Everything below mirrors the
 * real `todos` module. Flow: Zod contract -> Drizzle service -> oRPC controller.
 * See sibling skills orpc-contracts, drizzle-postgres, better-auth.
 */
import { Controller, UseInterceptors } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { ORPCError } from "@orpc/server"
import { and, desc, eq } from "drizzle-orm"
import { AllowAnonymous, Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { todos } from "@repo/db/schema"
import { db } from "@/common/database/database.client"
import { v1 } from "@/config/api-versions.config"
import { type V1Inputs } from "@/config/contract-types"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"
import { IdempotencyInterceptor } from "@/shared/interceptors/idempotency.interceptor"

// Types are inferred FROM the contract — never hand-written.
type CreateTodoInput = V1Inputs["example"]["todo"]["create"]
type UpdateTodoRequest = V1Inputs["example"]["todo"]["update"]

// ── Service: Drizzle `db` directly, no repository ──────────────────────────
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

  // Ownership is scoped IN the where clause (id AND authorId). A fetch-then-check
  // would be a TOCTOU and would leak existence. 0 rows -> 404 either way.
  async update({ payload, authorId }: { payload: UpdateTodoRequest; authorId: string }) {
    const id = payload.id as number
    const [todo] = await db
      .update(todos)
      .set({ title: payload.title, completed: payload.completed ?? false, updatedAt: new Date() })
      .where(and(eq(todos.id, id), eq(todos.authorId, authorId)))
      .returning()
    if (!todo) throw new ORPCError("NOT_FOUND", { message: `Todo ${id} not found` })
    return todo
  }

  async delete({ id, authorId }: { id: number; authorId: string }) {
    const deleted = await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.authorId, authorId)))
      .returning()
    if (!deleted.length) throw new ORPCError("NOT_FOUND", { message: `Todo ${id} not found` })
    return { success: true, id }
  }
}

// ── Controller: contract-first, decorated for auth/permissions/throttle ────
@Controller()
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @AllowAnonymous() // public reads
  @Implement(v1.example.todo.list)
  async listTodos() {
    return implement(v1.example.todo.list).handler(async () => this.todosService.findAll())
  }

  @AllowAnonymous()
  @Implement(v1.example.todo.get)
  async getTodo() {
    return implement(v1.example.todo.get).handler(async ({ input }) =>
      this.todosService.findOne({ id: input.id as number })
    )
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

  @StrictThrottle()
  @RequirePermissions("posts:edit")
  @UseInterceptors(IdempotencyInterceptor)
  @Implement(v1.example.todo.update)
  async updateTodo(@Session() session: UserSession) {
    return implement(v1.example.todo.update).handler(async ({ input }) =>
      this.todosService.update({ payload: input, authorId: session.user.id })
    )
  }

  @StrictThrottle()
  @RequirePermissions("posts:delete")
  @UseInterceptors(IdempotencyInterceptor)
  @Implement(v1.example.todo.delete)
  async removeTodo(@Session() session: UserSession) {
    return implement(v1.example.todo.delete).handler(async ({ input }) =>
      this.todosService.delete({ id: input.id as number, authorId: session.user.id })
    )
  }
}

// Register in a @Module({ controllers: [TodosController], providers: [TodosService,
// IdempotencyInterceptor] }) and import it into V1Module. No input/output
// validation here — the global ZodValidationPipe + ZodSerializerInterceptor
// enforce the contract schemas.
