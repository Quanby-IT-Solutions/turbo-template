import { afterEach, describe, expect, it, vi } from "vitest"

import { authLogger } from "./auth-logger.js"

/** The shape Drizzle throws: bound values in the message and on `.params`. */
class FakeDrizzleQueryError extends Error {
	params = ["reset-password:live-token", 1]
	constructor(cause: Error) {
		super(
			'Failed query: select "id" from "verifications" where "identifier" = $1\nparams: reset-password:live-token,1',
			{ cause }
		)
		this.name = "DrizzleQueryError"
	}
}

function printed(spy: { mock: { calls: unknown[][] } }): string {
	return spy.mock.calls
		.flat()
		.map(value => (typeof value === "string" ? value : JSON.stringify(value)))
		.join("\n")
}

describe("authLogger", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("prints a failed query without its bound values", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined)

		authLogger.log?.("error", "Error", new FakeDrizzleQueryError(new Error("connect ECONNREFUSED")))

		const output = printed(error)
		expect(output).not.toContain("live-token")
		expect(output).toContain("Failed query")
		expect(output).toContain("connect ECONNREFUSED")
	})

	it("redacts SQL params in a plain message and string arguments", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

		authLogger.log?.("warn", "Failed query: select 1\nparams: a@b.c", "params: a@b.c")

		expect(printed(warn)).not.toContain("a@b.c")
	})
})
