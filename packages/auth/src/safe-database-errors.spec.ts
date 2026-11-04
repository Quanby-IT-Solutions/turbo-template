import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

import { withSafeDatabaseErrors } from "./safe-database-errors.js"

/** Drizzle's shape: bound values in the message and on `.params`, a pg cause with `detail`. */
function drizzleError(): Error {
	const cause = Object.assign(new Error("duplicate key value violates unique constraint"), {
		detail: "Key (email)=(live@example.com) already exists.",
	})
	return Object.assign(
		new Error('Failed query: insert into "users" ("email") values ($1)\nparams: live@example.com', {
			cause,
		}),
		{ name: "DrizzleQueryError", params: ["live@example.com"] }
	)
}

describe("withSafeDatabaseErrors", () => {
	it("rethrows a failed query without its bound values anywhere on the error", async () => {
		const adapter = withSafeDatabaseErrors({
			create: () => Promise.reject(drizzleError()),
		})

		const thrown = await adapter.create().catch((error: unknown) => error)

		expect(inspect(thrown, { depth: 5 })).not.toContain("live@example.com")
		expect(String((thrown as Error).message)).toContain("Failed query")
		expect(((thrown as Error).cause as Error).message).toContain("duplicate key value")
	})

	it("passes results and non-function members through", async () => {
		const adapter = withSafeDatabaseErrors({ id: "drizzle", findOne: () => Promise.resolve(1) })

		expect(adapter.id).toBe("drizzle")
		await expect(adapter.findOne()).resolves.toBe(1)
	})
})
