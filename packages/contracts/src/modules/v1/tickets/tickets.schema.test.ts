import { describe, expect, it } from "vitest"

import { CreateTicketSchema, TicketIdSchema, TicketSchema } from "./tickets.schema.js"

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

/**
 * The timestamp fields accept either shape because one schema parses rows
 * straight out of Drizzle (`Date`) and JSON off the wire (ISO string). Both
 * arms of both transforms are exercised here.
 *
 * `CreateTicketSchema` picks neither field, so before this nothing in the suite
 * ever ran them — and since they are the only functions and the only branches
 * in the measured contract set, coverage reported 0% for both and failed the
 * gate for the whole package.
 */
describe("TicketSchema timestamps", () => {
	const row = {
		id: 1,
		name: "Jane Doe",
		email: "jane@example.com",
		subject: "Cannot sign in",
		priority: "high" as const,
		concern: "Password reset never arrives.",
		status: "received" as const,
		authorId: null,
	}

	it("passes Date values through unchanged", () => {
		const createdAt = new Date("2026-01-02T03:04:05.000Z")
		const updatedAt = new Date("2026-01-02T06:07:08.000Z")

		const result = TicketSchema.parse({ ...row, createdAt, updatedAt })

		expect(result.createdAt).toEqual(createdAt)
		expect(result.updatedAt).toEqual(updatedAt)
	})

	it("coerces ISO strings to Date", () => {
		const result = TicketSchema.parse({
			...row,
			createdAt: "2026-01-02T03:04:05.000Z",
			updatedAt: "2026-01-02T06:07:08.000Z",
		})

		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
		expect(result.createdAt.toISOString()).toBe("2026-01-02T03:04:05.000Z")
		expect(result.updatedAt.toISOString()).toBe("2026-01-02T06:07:08.000Z")
	})

	it("applies the priority and status defaults when omitted", () => {
		const result = TicketSchema.parse({
			id: row.id,
			name: row.name,
			email: row.email,
			subject: row.subject,
			concern: row.concern,
			authorId: row.authorId,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		expect(result.priority).toBe("medium")
		expect(result.status).toBe("received")
	})

	it("rejects a timestamp that is neither a Date nor a string", () => {
		expect(
			TicketSchema.safeParse({ ...row, createdAt: 12345, updatedAt: new Date() }).success
		).toBe(false)
	})
})

describe("TicketIdSchema", () => {
	it("coerces a numeric string id, matching a path parameter off the wire", () => {
		expect(TicketIdSchema.parse({ id: "42" })).toEqual({ id: 42 })
	})

	it("rejects a non-positive id", () => {
		expect(TicketIdSchema.safeParse({ id: 0 }).success).toBe(false)
	})
})
