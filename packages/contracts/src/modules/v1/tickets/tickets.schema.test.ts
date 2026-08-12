import { describe, expect, it } from "vitest"

import { CreateTicketSchema } from "./tickets.schema.js"

/** HY-2 / F-29 — the last unbounded string in the contract set. */
describe("CreateTicketSchema concern bound", () => {
	const valid = {
		name: "Jane Doe",
		email: "jane@example.com",
		subject: "Cannot sign in",
		priority: "medium" as const,
	}

	it("accepts prose of a realistic length", () => {
		expect(CreateTicketSchema.safeParse({ ...valid, concern: "a".repeat(5000) }).success).toBe(true)
	})

	it("rejects a concern over 5000 characters", () => {
		const result = CreateTicketSchema.safeParse({ ...valid, concern: "a".repeat(5001) })
		expect(result.success).toBe(false)
	})

	it("still rejects an empty concern", () => {
		expect(CreateTicketSchema.safeParse({ ...valid, concern: "" }).success).toBe(false)
	})
})
