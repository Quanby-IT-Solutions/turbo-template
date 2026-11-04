import { describe, expect, it } from "vitest"

import { scrubEventProperties } from "./analytics-scrub.js"

// The scrub every analytics event passes through before it leaves the app, on
// web and on the backend. Mobile has its own Dart twin over the same manifest.
describe("scrubEventProperties", () => {
	it("drops a deny-listed key at the top level", () => {
		expect(scrubEventProperties({ email: "a@b.c", path: "/x" })).toEqual({ path: "/x" })
	})

	it("matches case-insensitively", () => {
		expect(scrubEventProperties({ Authorization: "x" })).toEqual({})
	})

	it("drops deny-listed keys inside nested objects and arrays", () => {
		// The mobile scrub once looked only inside maps of one exact type and let
		// `{ password }` through; nested values of any shape must be checked.
		expect(
			scrubEventProperties({
				form: { password: "x", step: 2 },
				items: [{ token: "t", id: 1 }],
			})
		).toEqual({ form: { step: 2 }, items: [{ id: 1 }] })
	})

	it("keeps null and primitives", () => {
		expect(scrubEventProperties({ a: null, b: 0, c: false })).toEqual({ a: null, b: 0, c: false })
	})

	it("does not mutate its input", () => {
		const input = { form: { email: "a", step: 2 } }
		scrubEventProperties(input)
		expect(input).toEqual({ form: { email: "a", step: 2 } })
	})

	it("keeps distinct_id", () => {
		expect(scrubEventProperties({ distinct_id: "u1" })).toEqual({ distinct_id: "u1" })
	})
})
