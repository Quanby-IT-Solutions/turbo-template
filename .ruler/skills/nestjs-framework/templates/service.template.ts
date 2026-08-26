// TEMPLATE: Drizzle service for this repo (no repository layer, no TypeORM).
// Placeholders: {{EntityName}} Pascal, {{entityName}} camel, {{table-name}} table export.
// Model: apps/backend/src/modules/v1/examples/todos/todos.service.ts
//
// - Query the `db` singleton directly with drizzle-orm operators.
// - Types come FROM the contract via V1Inputs — never hand-write request types.
// - Throw ORPCError, NOT NestJS HTTP exceptions (oRPC turns those into a 500).
// - Ownership is scoped IN the where clause: filter, don't fetch-then-compare.
import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, desc, eq } from "drizzle-orm"

import { {{table-name}} } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { type V1Inputs } from "@/config/contract-types"

type Create{{EntityName}}Input = V1Inputs["{{entityName}}"]["create"]
type Update{{EntityName}}Request = V1Inputs["{{entityName}}"]["update"]
type {{EntityName}}IdInput = V1Inputs["{{entityName}}"]["get"]

@Injectable()
export class {{EntityName}}Service {
  async findAll() {
    return db.select().from({{table-name}}).orderBy(desc({{table-name}}.updatedAt))
  }

  async findOne({ id }: { id: {{EntityName}}IdInput["id"] }) {
    const [row] = await db.select().from({{table-name}}).where(eq({{table-name}}.id, id as number))
    if (!row) throw new ORPCError("NOT_FOUND", { message: `{{EntityName}} ${id} not found` })
    return row
  }

  async create({ payload, authorId }: { payload: Create{{EntityName}}Input; authorId: string }) {
    const [row] = await db
      .insert({{table-name}})
      .values({ ...payload, authorId })
      .returning()
    if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "{{EntityName}} not created" })
    return row
  }

  async update({ payload, authorId }: { payload: Update{{EntityName}}Request; authorId: string }) {
    const id = payload.id as number
    const [row] = await db
      .update({{table-name}})
      .set({ ...payload, updatedAt: new Date() })
      // Ownership + existence in one query. 0 rows → 404 (missing OR not yours).
      .where(and(eq({{table-name}}.id, id), eq({{table-name}}.authorId, authorId)))
      .returning()
    if (!row) throw new ORPCError("NOT_FOUND", { message: `{{EntityName}} ${id} not found` })
    return row
  }

  async delete({ id, authorId }: { id: {{EntityName}}IdInput["id"]; authorId: string }) {
    const deleted = await db
      .delete({{table-name}})
      .where(and(eq({{table-name}}.id, id as number), eq({{table-name}}.authorId, authorId)))
      .returning()
    if (!deleted.length) throw new ORPCError("NOT_FOUND", { message: `{{EntityName}} ${id} not found` })
    return { success: true, id: id as number }
  }
}
