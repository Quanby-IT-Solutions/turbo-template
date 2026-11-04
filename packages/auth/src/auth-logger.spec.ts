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

	// Better Auth's default line, so operators' greps keep working
	// (AC2 walk 11/4: the first version printed "[Better Auth]: User not found").
	it("prints the timestamp and level the default logger prints", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

		authLogger.log?.("warn", "User not found")

		expect(warn.mock.calls[0]?.[0]).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z WARN \[Better Auth\]: User not found$/
		)
	})

	it("writes info and debug through console.log, as the default logger does", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined)

		authLogger.log?.("info", "ready")
		authLogger.log?.("debug", "detail")

		expect(log.mock.calls.map(call => String(call[0]))).toEqual([
			expect.stringMatching(/ INFO \[Better Auth\]: ready$/),
			expect.stringMatching(/ DEBUG \[Better Auth\]: detail$/),
		])
	})

	it("redacts SQL params in a plain message and string arguments", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

		authLogger.log?.("warn", "Failed query: select 1\nparams: a@b.c", "params: a@b.c")

		expect(printed(warn)).not.toContain("a@b.c")
	})
})
