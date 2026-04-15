import { describe, expect, it } from "vitest"

import {
	CreateTodoSchema,
	TodoIdSchema,
	TodoSchema,
	UpdateTodoRequestSchema,
	UpdateTodoSchema,
	type CreateTodoInput,
	type Todo,
	type TodoIdInput,
	type UpdateTodoInput,
	type UpdateTodoRequest,
} from "./todos.schema"

// ============================================================================
// TodoSchema
// ============================================================================

describe("TodoSchema", () => {
	it("parses a valid todo with date objects", () => {
		const now = new Date()
		const input = {
			id: 1,
			title: "Buy groceries",
			completed: false,
			authorId: "user-123",
			createdAt: now,
			updatedAt: now,
		}
		const result: Todo = TodoSchema.parse(input)
		expect(result.id).toBe(1)
		expect(result.title).toBe("Buy groceries")
		expect(result.completed).toBe(false)
		expect(result.createdAt).toBeInstanceOf(Date)
	})

	it("coerces string dates to Date objects", () => {
		const isoString = "2024-01-15T10:00:00.000Z"
		const input = {
			id: 2,
			title: "Read a book",
			completed: true,
			authorId: "user-456",
			createdAt: isoString,
			updatedAt: isoString,
		}
		const result = TodoSchema.parse(input)
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	it("rejects a non-positive id", () => {
		const input = {
			id: -1,
			title: "Bad todo",
			completed: false,
			authorId: "user-123",
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		const result = TodoSchema.safeParse(input)
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues).toHaveLength(1)
			expect(result.error.issues[0]!.path).toEqual(["id"])
			expect(result.error.issues[0]!.code).toBe("too_small")
		}
	})

	it("rejects an empty title", () => {
		const input = {
			id: 1,
			title: "",
			completed: false,
			authorId: "user-123",
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		const result = TodoSchema.safeParse(input)
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues).toHaveLength(1)
			expect(result.error.issues[0]!.path).toEqual(["title"])
			expect(result.error.issues[0]!.code).toBe("too_small")
			expect(result.error.issues[0]!.message).toBe("Title is required")
		}
	})

	it("rejects a title exceeding 255 characters", () => {
		const input = {
			id: 1,
			title: "a".repeat(256),
			completed: false,
			authorId: "user-123",
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		const result = TodoSchema.safeParse(input)
		expect(result.success).toBe(false)
	})

	it("rejects missing required fields", () => {
		const result = TodoSchema.safeParse({ id: 1, title: "incomplete" })
		expect(result.success).toBe(false)
	})
})

// ============================================================================
// TodoIdSchema
// ============================================================================

describe("TodoIdSchema", () => {
	it("parses a valid positive integer id", () => {
		const result: TodoIdInput = TodoIdSchema.parse({ id: 42 })
		expect(result.id).toBe(42)
	})

	it("coerces a numeric string to a number", () => {
		const result = TodoIdSchema.parse({ id: "7" })
		expect(result.id).toBe(7)
	})

	it("rejects id of zero", () => {
		const result = TodoIdSchema.safeParse({ id: 0 })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["id"])
			expect(result.error.issues[0]!.code).toBe("too_small")
		}
	})

	it("rejects a negative id", () => {
		const result = TodoIdSchema.safeParse({ id: -5 })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["id"])
			expect(result.error.issues[0]!.code).toBe("too_small")
		}
	})

	it("rejects a missing id", () => {
		const result = TodoIdSchema.safeParse({})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["id"])
			expect(result.error.issues[0]!.code).toBe("invalid_type")
		}
	})
})

// ============================================================================
// CreateTodoSchema
// ============================================================================

describe("CreateTodoSchema", () => {
	it("parses a valid create input with title and completed", () => {
		const input = { title: "New task", completed: false }
		const result: CreateTodoInput = CreateTodoSchema.parse(input)
		expect(result.title).toBe("New task")
		expect(result.completed).toBe(false)
	})

	it("uses default false for completed when omitted", () => {
		const result = CreateTodoSchema.parse({ title: "Task without completed" })
		expect(result.completed).toBe(false)
	})

	it("rejects an empty title", () => {
		const result = CreateTodoSchema.safeParse({ title: "" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["title"])
			expect(result.error.issues[0]!.code).toBe("too_small")
			expect(result.error.issues[0]!.message).toBe("Title is required")
		}
	})

	it("rejects a title that is too long", () => {
		const result = CreateTodoSchema.safeParse({ title: "x".repeat(256) })
		expect(result.success).toBe(false)
	})

	it("rejects missing title", () => {
		const result = CreateTodoSchema.safeParse({ completed: true })
		expect(result.success).toBe(false)
	})
})

// ============================================================================
// UpdateTodoSchema
// ============================================================================

describe("UpdateTodoSchema", () => {
	it("parses an update with both fields", () => {
		const input = { title: "Updated title", completed: true }
		const result: UpdateTodoInput = UpdateTodoSchema.parse(input)
		expect(result.title).toBe("Updated title")
		expect(result.completed).toBe(true)
	})

	it("parses an update with only title", () => {
		const result = UpdateTodoSchema.parse({ title: "Only title" })
		expect(result.title).toBe("Only title")
		// completed has a default of false in the base schema, carried through partial()
		expect(result.completed).toBe(false)
	})

	it("parses an update with only completed", () => {
		const result = UpdateTodoSchema.parse({ completed: false })
		expect(result.title).toBeUndefined()
		expect(result.completed).toBe(false)
	})

	it("parses an empty object since all fields are optional", () => {
		const result = UpdateTodoSchema.safeParse({})
		expect(result.success).toBe(true)
	})

	it("rejects an empty title string", () => {
		const result = UpdateTodoSchema.safeParse({ title: "" })
		expect(result.success).toBe(false)
	})

	it("rejects a title exceeding 255 characters", () => {
		const result = UpdateTodoSchema.safeParse({ title: "y".repeat(256) })
		expect(result.success).toBe(false)
	})
})

// ============================================================================
// UpdateTodoRequestSchema
// ============================================================================

describe("UpdateTodoRequestSchema", () => {
	it("parses a full update request with id, title, and completed", () => {
		const input = { id: 3, title: "Full update", completed: true }
		const result: UpdateTodoRequest = UpdateTodoRequestSchema.parse(input)
		expect(result.id).toBe(3)
		expect(result.title).toBe("Full update")
		expect(result.completed).toBe(true)
	})

	it("parses with id only (partial update with no body fields)", () => {
		const result = UpdateTodoRequestSchema.parse({ id: 10 })
		expect(result.id).toBe(10)
		expect(result.title).toBeUndefined()
		// completed has a default of false carried through from base schema
		expect(result.completed).toBe(false)
	})

	it("coerces string id to number", () => {
		const result = UpdateTodoRequestSchema.parse({ id: "5", title: "Coerced" })
		expect(result.id).toBe(5)
	})

	it("rejects a negative id", () => {
		const result = UpdateTodoRequestSchema.safeParse({ id: -1, title: "Bad" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["id"])
			expect(result.error.issues[0]!.code).toBe("too_small")
		}
	})

	it("rejects an empty title", () => {
		const result = UpdateTodoRequestSchema.safeParse({ id: 1, title: "" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["title"])
			expect(result.error.issues[0]!.code).toBe("too_small")
			expect(result.error.issues[0]!.message).toBe("Title is required")
		}
	})

	it("rejects missing id", () => {
		const result = UpdateTodoRequestSchema.safeParse({ title: "No id" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]!.path).toEqual(["id"])
			expect(result.error.issues[0]!.code).toBe("invalid_type")
		}
	})
})
