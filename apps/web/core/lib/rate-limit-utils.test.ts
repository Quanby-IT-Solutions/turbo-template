import { describe, expect, it } from "vitest"

import { ApiError } from "@/core/lib/api-error"

import { createRetryAfterCapture, parseRateLimitError, RateLimitError } from "./rate-limit-utils"

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

const HEADERLESS_429 = {
	status: 429,
	statusText: "Too Many Requests",
	message: "Too many requests. Please try again later.",
}

describe("createRetryAfterCapture", () => {
	it("reads X-Retry-After from a 429 Response when the error has no headers", () => {
		const capture = createRetryAfterCapture()
		const response = new Response(null, {
			status: 429,
			headers: { "X-Retry-After": "10" },
		})

		capture.fetchOptions.onError({
			response,
			responseText: JSON.stringify({ message: HEADERLESS_429.message }),
			request: new Request("http://localhost:3000/api/v1/auth/sign-in/email"),
			error: { ...HEADERLESS_429 },
		})

		expect(HEADERLESS_429).not.toHaveProperty("headers")
		expect(capture.seconds(HEADERLESS_429)).toBe(10)
	})

	it("reads Retry-After when that is the only wait header", () => {
		const capture = createRetryAfterCapture()
		capture.fetchOptions.onError({
			response: new Response(null, {
				status: 429,
				headers: { "Retry-After": "12" },
			}),
		})

		expect(capture.seconds(HEADERLESS_429)).toBe(12)
	})

	it("prefers Retry-After over X-Retry-After, error.headers, and the message", () => {
		const capture = createRetryAfterCapture()
		capture.fetchOptions.onError({
			response: new Response(null, {
				status: 429,
				headers: { "Retry-After": "7", "X-Retry-After": "10" },
			}),
		})

		expect(
			capture.seconds({
				headers: new Headers({ "retry-after": "42" }),
				message: "try again in 3 seconds",
			})
		).toBe(7)
	})

	it("captures nothing from a non-429 response", () => {
		const capture = createRetryAfterCapture()
		capture.fetchOptions.onError({
			response: new Response(null, {
				status: 401,
				headers: { "X-Retry-After": "10", "Retry-After": "10" },
			}),
		})

		expect(capture.seconds(HEADERLESS_429)).toBeNull()
		expect(capture.seconds({ message: "try again in 4 seconds" })).toBe(4)
	})

	it("falls back to error.headers when the response was not captured", () => {
		const capture = createRetryAfterCapture()
		expect(
			capture.seconds({
				headers: new Headers({ "x-retry-after": "15" }),
				message: "try again in 3 seconds",
			})
		).toBe(15)
	})

	it("falls back to a number in the message when no header is available", () => {
		const capture = createRetryAfterCapture()
		expect(capture.seconds({ message: "try again in 20 seconds" })).toBe(20)
		expect(capture.seconds(HEADERLESS_429)).toBeNull()
	})

	it("keeps each request's capture separate", () => {
		const first = createRetryAfterCapture()
		const second = createRetryAfterCapture()
		first.fetchOptions.onError({
			response: new Response(null, {
				status: 429,
				headers: { "X-Retry-After": "10" },
			}),
		})

		expect(first.seconds(HEADERLESS_429)).toBe(10)
		expect(second.seconds(HEADERLESS_429)).toBeNull()
	})
})
