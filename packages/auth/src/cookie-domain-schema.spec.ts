import { describe, expect, it } from "vitest"

import { cookieDomainSchema, isValidCookieDomain } from "./cookie-domain-schema.js"

// AC-3 / F-33: any non-empty value used to enable cross-subdomain cookies, so a
// typo or a pasted URL silently widened the session cookie's scope.

describe("isValidCookieDomain", () => {
	it.each([".example.com", "example.com", "app.example.co.uk", "localhost", ".localhost"])(
		"accepts %s",
		value => {
			expect(isValidCookieDomain(value)).toBe(true)
		}
	)

	it.each([
		["a scheme", "https://example.com"],
		["a port", "example.com:3000"],
		["a path", "example.com/app"],
		["surrounding whitespace", " example.com "],
		["an inner space", "example .com"],
		["an empty string", ""],
		["a quote left from copy/paste", '"example.com"'],
		["a bare label with no TLD", "example"],
		["a wildcard", "*.example.com"],
	])("rejects %s", (_label, value) => {
		expect(isValidCookieDomain(value)).toBe(false)
	})
})

describe("cookieDomainSchema", () => {
	it("allows the variable to be unset — the narrow default", () => {
		expect(cookieDomainSchema.parse(undefined)).toBeUndefined()
	})

	it("rejects a malformed value with an actionable message", () => {
		const result = cookieDomainSchema.safeParse("https://example.com")

		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toMatch(/bare hostname/)
	})
})
