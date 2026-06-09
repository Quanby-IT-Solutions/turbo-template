import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { desc, eq } from "drizzle-orm"

import { todos } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { type V1Inputs } from "@/config/contract-types"

type CreateTodoInput = V1Inputs["example"]["todo"]["create"]
type TodoIdInput = V1Inputs["example"]["todo"]["get"]
type UpdateTodoRequest = V1Inputs["example"]["todo"]["update"]

@Injectable()
export class TodosService {
	async findAll() {
		const result = await db
			.select()
			.from(todos)
			.orderBy(desc(todos.completed), desc(todos.updatedAt))
		return result
	}

	async findOne({ id }: { id: TodoIdInput["id"] }) {
		const idNum = id as number
		const [todo] = await db.select().from(todos).where(eq(todos.id, idNum))
		if (!todo) throw new ORPCError("NOT_FOUND", { message: `Todo with ID ${idNum} not found` })
		return todo
	}

	async create({ payload, authorId }: { payload: CreateTodoInput; authorId: string }) {
		const [todo] = await db
			.insert(todos)
			.values({
				title: payload.title,
				completed: payload.completed ?? false,
				authorId,
			})
			.returning()
		if (!todo) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Todo not created" })
		return todo
	}

	async update({ payload }: { payload: UpdateTodoRequest }) {
		const id = payload.id as number
		const [todo] = await db
			.update(todos)
			.set({
				title: payload.title,
				completed: payload.completed ?? false,
				updatedAt: new Date(),
			})
			.where(eq(todos.id, id))
			.returning()
		if (!todo) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Todo not updated" })
		return todo
	}

	async delete({ id }: { id: TodoIdInput["id"] }) {
		const idNum = id as number
		await db.delete(todos).where(eq(todos.id, idNum))
		return { success: true, id: idNum }
	}
}
