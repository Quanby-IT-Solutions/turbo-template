/**
 * AZ-3 / F-11 + F-30 — ownership scoping on todo mutations, ticket authorship.
 *
 * Against a real Postgres: the guarantee is that the `where` clause matches
 * zero rows for a non-owner, which is a property of the query, not of the
 * service's control flow. A mocked db would assert only that we *called* it a
 * certain way.
 */

import { and, eq, sql } from "drizzle-orm"

import { tickets, todos, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { TicketsService } from "@/modules/v1/tickets/tickets.service"

import { TodosService } from "./todos.service"

jest.mock("@orpc/server", () => ({
	ORPCError: class ORPCError extends Error {
		constructor(
			public code: string,
			options?: { message?: string }
		) {
			super(options?.message ?? code)
			this.name = "ORPCError"
		}
	},
}))

const USER_A = "az3-user-a"
const USER_B = "az3-user-b"

let dbReachable = false

async function cleanup() {
	for (const id of [USER_A, USER_B]) {
		await db.delete(todos).where(eq(todos.authorId, id))
		await db.delete(tickets).where(eq(tickets.authorId, id))
		await db.delete(users).where(eq(users.id, id))
	}
}

beforeAll(async () => {
	try {
		await db.execute(sql`select 1`)
		dbReachable = true
	} catch {
		return
	}

	await cleanup()
	const now = new Date()
	await db.insert(users).values(
		[USER_A, USER_B].map(id => ({
			id,
			name: id,
			email: `${id}@test.local`,
			createdAt: now,
			updatedAt: now,
		}))
	)
})

afterAll(async () => {
	if (!dbReachable) return
	await cleanup()
	await db.$client.end()
})

const itDb: jest.It = ((name: string, fn: jest.ProvidesCallback, timeout?: number) =>
	it(
		name,
		async (...args: unknown[]) => {
			if (!dbReachable) {
				console.warn(`[az-3] skipped "${name}": no database reachable`)
				return
			}
			return (fn as (...a: unknown[]) => unknown)(...args)
		},
		timeout
	)) as jest.It

const service = new TodosService()

/** A todo owned by user A. */
async function todoOwnedByA(title = "A's todo") {
	return service.create({ payload: { title, completed: false }, authorId: USER_A })
}

describe("todo mutations are scoped to the owner (F-11)", () => {
	beforeEach(async () => {
		if (!dbReachable) return
		await db.delete(todos).where(eq(todos.authorId, USER_A))
		await db.delete(todos).where(eq(todos.authorId, USER_B))
	})

	itDb("user B cannot update user A's todo", async () => {
		const todo = await todoOwnedByA()

		await expect(
			service.update({
				payload: { id: todo.id, title: "hijacked", completed: true },
				authorId: USER_B,
			})
		).rejects.toThrow(/not found/i)
	})

	itDb("the data is unchanged after a rejected cross-user update", async () => {
		const todo = await todoOwnedByA("original title")

		await expect(
			service.update({
				payload: { id: todo.id, title: "hijacked", completed: true },
				authorId: USER_B,
			})
		).rejects.toThrow()

		const [after] = await db.select().from(todos).where(eq(todos.id, todo.id))
		expect(after?.title).toBe("original title")
		expect(after?.completed).toBe(false)
	})

	itDb("user B cannot delete user A's todo, and the row survives", async () => {
		const todo = await todoOwnedByA()

		await expect(service.delete({ id: todo.id, authorId: USER_B })).rejects.toThrow(/not found/i)

		const [after] = await db.select().from(todos).where(eq(todos.id, todo.id))
		expect(after).toBeDefined()
	})

	itDb("the owner can update their own todo", async () => {
		const todo = await todoOwnedByA()

		const updated = await service.update({
			payload: { id: todo.id, title: "renamed by owner", completed: true },
			authorId: USER_A,
		})

		expect(updated.title).toBe("renamed by owner")
		expect(updated.completed).toBe(true)
	})

	itDb("the owner can delete their own todo", async () => {
		const todo = await todoOwnedByA()

		await expect(service.delete({ id: todo.id, authorId: USER_A })).resolves.toEqual({
			success: true,
			id: todo.id,
		})

		const rows = await db.select().from(todos).where(eq(todos.id, todo.id))
		expect(rows).toHaveLength(0)
	})

	itDb("a non-owner gets the same answer for a missing todo as for someone else's", async () => {
		// Both are 404 on purpose: a distinct "forbidden" would confirm the row
		// exists and turn the endpoint into an oracle for valid ids.
		const todo = await todoOwnedByA()

		const foreign = await service
			.delete({ id: todo.id, authorId: USER_B })
			.catch((e: Error) => e.message)
		const missing = await service
			.delete({ id: 9_999_999, authorId: USER_B })
			.catch((e: Error) => e.message)

		expect(foreign).toMatch(/not found/i)
		expect(missing).toMatch(/not found/i)
	})

	itDb("one user's todos are untouched when another deletes theirs", async () => {
		const aTodo = await todoOwnedByA()
		const bTodo = await service.create({
			payload: { title: "B's todo", completed: false },
			authorId: USER_B,
		})

		await service.delete({ id: bTodo.id, authorId: USER_B })

		const remaining = await db
			.select()
			.from(todos)
			.where(and(eq(todos.id, aTodo.id), eq(todos.authorId, USER_A)))
		expect(remaining).toHaveLength(1)
	})
})

describe("submitted tickets are attributed (F-30)", () => {
	const ticketsService = new TicketsService()

	itDb("records the submitting user's id", async () => {
		const ticket = await ticketsService.submit({
			authorId: USER_A,
			payload: {
				name: "Reporter",
				email: "reporter@test.local",
				subject: "Something broke",
				concern: "Details of the concern",
			},
		})

		const [stored] = await db.select().from(tickets).where(eq(tickets.id, ticket.id))
		expect(stored?.authorId).toBe(USER_A)
	})

	itDb("still records a ticket when there is no session", async () => {
		// Nullable by design: the column is additive over pre-existing rows, and
		// the submit route is not permission-gated.
		const ticket = await ticketsService.submit({
			authorId: null,
			payload: {
				name: "Anonymous",
				email: "anon@test.local",
				subject: "No session",
				concern: "Submitted without signing in",
			},
		})

		expect(ticket.id).toBeDefined()
		expect(ticket.authorId).toBeNull()

		await db.delete(tickets).where(eq(tickets.id, ticket.id))
	})
})
