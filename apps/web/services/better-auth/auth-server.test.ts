import { beforeEach, describe, expect, it, vi } from "vitest"

import { getSession, SessionUnavailableError } from "./auth-server"

const getCookieHeader = vi.hoisted(() => vi.fn(async () => "better-auth.session_token=abc"))
const getForwardedForHeader = vi.hoisted(() => vi.fn(async () => undefined as string | undefined))

vi.mock("@/core/lib/cookie-utils", () => ({
	getCookieHeader,
}))

vi.mock("next/navigation", () => ({
	unstable_rethrow: () => {},
}))

vi.mock("@/core/lib/server-utils", () => ({
	getServerAuthUrl: () => "http://backend.test/api/v1/auth",
	getForwardedForHeader,
}))

const sessionBody = {
	user: { id: "user-1", email: "ada@example.com", name: "Ada" },
	session: { id: "session-1" },
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", ...headers },
	})
}

describe("getSession", () => {
	beforeEach(() => {
		getCookieHeader.mockResolvedValue("better-auth.session_token=abc")
		getForwardedForHeader.mockResolvedValue(undefined)
		vi.stubGlobal("fetch", vi.fn())
	})

	it("returns the session on 200 with a user", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(200, sessionBody))

		await expect(getSession()).resolves.toEqual(sessionBody)

		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			"http://backend.test/api/v1/auth/get-session",
			expect.objectContaining({
				headers: expect.objectContaining({
					cookie: "better-auth.session_token=abc",
				}),
				cache: "no-store",
			})
		)
	})

	it("returns null for a 200 null body", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(200, null))

		await expect(getSession()).resolves.toBeNull()
	})

	it("returns null for 401", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { message: "Unauthorized" }))

		await expect(getSession()).resolves.toBeNull()
	})

	it("throws when the read is rate limited and keeps x-retry-after", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(429, { message: "Too many requests" }, { "x-retry-after": "7" })
		)

		await expect(getSession()).rejects.toMatchObject({
			name: "SessionUnavailableError",
			status: 429,
			retryAfter: "7",
		})
		await expect(getSession()).rejects.toBeInstanceOf(SessionUnavailableError)
	})

	it("throws on 503", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(503, { message: "unavailable" }))

		await expect(getSession()).rejects.toMatchObject({ status: 503, retryAfter: null })
	})

	it("throws when the request fails", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("connect ECONNREFUSED"))

		await expect(getSession()).rejects.toBeInstanceOf(SessionUnavailableError)
		await expect(getSession()).rejects.toMatchObject({ status: null, retryAfter: null })
		expect(vi.mocked(fetch)).toHaveBeenCalled()
	})

	it("throws when a success body is not valid JSON", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("not-json", { status: 200 }))

		await expect(getSession()).rejects.toBeInstanceOf(SessionUnavailableError)
		await expect(getSession()).rejects.toMatchObject({ status: null, retryAfter: null })
	})

	it("propagates a cookie header failure without calling fetch", async () => {
		const failure = new Error("cookie header failed")
		getCookieHeader.mockRejectedValue(failure)

		await expect(getSession()).rejects.toBe(failure)
		expect(failure).not.toBeInstanceOf(SessionUnavailableError)
		expect(vi.mocked(fetch)).not.toHaveBeenCalled()
	})

	it("propagates a forwarded header failure without calling fetch", async () => {
		const failure = new Error("forwarded header failed")
		getForwardedForHeader.mockRejectedValue(failure)

		await expect(getSession()).rejects.toBe(failure)
		expect(failure).not.toBeInstanceOf(SessionUnavailableError)
		expect(vi.mocked(fetch)).not.toHaveBeenCalled()
	})
})
