import { describe, expect, it } from "vitest"

import { ApiError } from "@/core/lib/api-error"

import { parseRateLimitError, RateLimitError } from "./rate-limit-utils"

describe("parseRateLimitError", () => {
	it("reads Retry-After from a 429 ApiError", () => {
		const result = parseRateLimitError(new ApiError(429, "Too many requests", 30))
		expect(result.isRateLimit).toBe(true)
		expect(result.retryAfter).toBe(30)
		expect(result.message).toContain("30 seconds")
	})

	it("reads X-Retry-After value carried on a 429 ApiError", () => {
		const result = parseRateLimitError(new ApiError(429, "Too many requests", 15))
		expect(result.isRateLimit).toBe(true)
		expect(result.retryAfter).toBe(15)
		expect(result.message).toContain("15 seconds")
	})

	it("detects a 429 from the Better Auth error shape", () => {
		const result = parseRateLimitError({ status: 429, message: "Too many requests" })
		expect(result.isRateLimit).toBe(true)
	})

	it("reads Retry-After header from a Better Auth error object", () => {
		const headers = new Headers({ "retry-after": "42" })
		const result = parseRateLimitError({ status: 429, message: "slow down", headers })
		expect(result.isRateLimit).toBe(true)
		expect(result.retryAfter).toBe(42)
	})

	it("parses seconds from the Better Auth error message when no header", () => {
		const result = parseRateLimitError({ status: 429, message: "try again in 20 seconds" })
		expect(result.isRateLimit).toBe(true)
		expect(result.retryAfter).toBe(20)
	})

	it("detects a RateLimitError instance with null retryAfter", () => {
		const result = parseRateLimitError(new RateLimitError(null))
		expect(result.isRateLimit).toBe(true)
		expect(result.retryAfter).toBeNull()
		expect(result.message).toBe("Too many attempts. Please try again shortly.")
	})

	it("returns fallback for a generic Error", () => {
		const result = parseRateLimitError(new Error("Network error"))
		expect(result.isRateLimit).toBe(false)
		expect(result.retryAfter).toBeNull()
	})

	it("returns fallback for a non-429 ApiError", () => {
		const result = parseRateLimitError(new ApiError(500, "Server error"))
		expect(result.isRateLimit).toBe(false)
	})
})
