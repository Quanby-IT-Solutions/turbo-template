import { describe, expect, it } from "vitest"

import {
	AUTH_SECRET_MIN_LENGTH,
	authSecretSchema,
	isPlaceholderSecret,
	PLACEHOLDER_SECRET_PREFIXES,
} from "./secret-schema.js"

// AC-1 / F-03: a missing, short, or template-default BETTER_AUTH_SECRET must be
// rejected so the process fails closed instead of signing forgeable sessions.

const VALID_SECRET = "Zq3n1r5pQ8vT2wY6bK9cA4dF7gH0jL2m" // 32 chars, no placeholder prefix

describe("authSecretSchema", () => {
	it("accepts a 32+ character random secret", () => {
		expect(authSecretSchema.parse(VALID_SECRET)).toBe(VALID_SECRET)
		// The shape `openssl rand -base64 32` actually produces (44 chars).
		const openssl = "hK8Qw2Zt7Yv1Rb4Nc0Ma6Xe3Lp9Jd5Sg8Uf2Ih7Oy1Kq="
		expect(authSecretSchema.parse(openssl)).toBe(openssl)
	})

	it("rejects a secret shorter than the minimum", () => {
		const short = "a".repeat(AUTH_SECRET_MIN_LENGTH - 1)
		const result = authSecretSchema.safeParse(short)

		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toContain("at least 32 characters")
		expect(result.error?.issues[0]?.message).toContain("openssl rand -base64 32")
	})

	it("rejects an empty / missing value", () => {
		expect(authSecretSchema.safeParse("").success).toBe(false)
		expect(authSecretSchema.safeParse(undefined).success).toBe(false)
	})

	it("rejects the secret .env.example used to ship", () => {
		const result = authSecretSchema.safeParse("default-secret-for-testing-change-in-production")

		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toContain("template placeholder")
		expect(result.error?.issues[0]?.message).toContain("openssl rand -base64 32")
	})

	it("rejects the current .env.example placeholder", () => {
		expect(authSecretSchema.safeParse("<replace-me-run-openssl-rand-base64-32>").success).toBe(
			false
		)
	})

	it.each(PLACEHOLDER_SECRET_PREFIXES)(
		"rejects any long-enough secret starting with %s",
		prefix => {
			const padded = `${prefix}${"x".repeat(AUTH_SECRET_MIN_LENGTH)}`

			expect(padded.length).toBeGreaterThanOrEqual(AUTH_SECRET_MIN_LENGTH)
			expect(authSecretSchema.safeParse(padded).success).toBe(false)
		}
	)

	it("matches placeholders case-insensitively and ignores surrounding whitespace", () => {
		expect(isPlaceholderSecret("  DEFAULT-SECRET-for-testing-change-in-production  ")).toBe(true)
		expect(isPlaceholderSecret(VALID_SECRET)).toBe(false)
	})
})
