import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, desc, eq } from "drizzle-orm"

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

	/**
	 * Update a todo the caller owns.
	 *
	 * AZ-3 / F-11: the `where` matched on `id` alone, so `posts:edit` — a
	 * permission every signed-in user effectively has — let anyone rewrite
	 * anyone's row. Ownership is identity-scoped, not permission-scoped:
	 * holding the permission means you may edit *your* todos.
	 *
	 * This two-term `where` is the template's canonical ownership check.
	 * Filtering in the query rather than fetching-then-comparing matters: a
	 * read followed by a check is a TOCTOU, and it also leaks existence, since
	 * a "forbidden" response confirms the row is there.
	 */
	async update({ payload, authorId }: { payload: UpdateTodoRequest; authorId: string }) {
		const id = payload.id as number
		const [todo] = await db
			.update(todos)
			.set({
				title: payload.title,
				completed: payload.completed ?? false,
				updatedAt: new Date(),
			})
			.where(and(eq(todos.id, id), eq(todos.authorId, authorId)))
			.returning()

		// Zero rows means the todo does not exist *or* belongs to someone else.
		// Both answer 404 on purpose: distinguishing them would turn this
		// endpoint into an oracle for which ids exist.
		if (!todo) throw new ORPCError("NOT_FOUND", { message: `Todo with ID ${id} not found` })
		return todo
	}

	/** Delete a todo the caller owns. Same ownership rules as {@link update}. */
	async delete({ id, authorId }: { id: TodoIdInput["id"]; authorId: string }) {
		const idNum = id as number
		const deleted = await db
			.delete(todos)
			.where(and(eq(todos.id, idNum), eq(todos.authorId, authorId)))
			.returning()

		if (!deleted.length) {
			throw new ORPCError("NOT_FOUND", { message: `Todo with ID ${idNum} not found` })
		}
		return { success: true, id: idNum }
	}
}
