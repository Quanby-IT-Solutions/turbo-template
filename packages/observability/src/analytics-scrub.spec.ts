import { describe, expect, it } from "vitest"

import { scrubEventProperties } from "./analytics-scrub.js"
import { REDACTED_VALUE } from "./redaction.js"

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

	it("redacts credential query parameters in URL-shaped properties", () => {
		// The verify-email and reset-password pages carry ?token= in the URL, and
		// every pageview sends that URL as $current_url (and later $referrer).
		expect(
			scrubEventProperties({
				$current_url: "https://app.example.com/reset-password?token=abc&lang=en",
				$referrer: "/verify-email?token=xyz",
				$set: { $initial_current_url: "/verify-email?token=xyz" },
			})
		).toEqual({
			$current_url: `https://app.example.com/reset-password?token=${REDACTED_VALUE}&lang=en`,
			$referrer: `/verify-email?token=${REDACTED_VALUE}`,
			$set: { $initial_current_url: `/verify-email?token=${REDACTED_VALUE}` },
		})
	})

	it("leaves strings under other keys alone, even with a question mark", () => {
		expect(scrubEventProperties({ question: "why?token=x" })).toEqual({ question: "why?token=x" })
	})

	it("never passes a deny-listed key through below the depth bound", () => {
		// Past the bound the value is replaced, not returned untouched.
		const deep = { a: { b: { c: { d: { password: "x" } } } }, list: [[[[{ token: "t" }]]]] }

		expect(JSON.stringify(scrubEventProperties(deep))).not.toMatch(/password|"token"/)
	})

	it("keeps distinct_id", () => {
		expect(scrubEventProperties({ distinct_id: "u1" })).toEqual({ distinct_id: "u1" })
	})
})
