import type * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { CacheIdentity } from "./cache-identity"

const { getSession, SessionUnavailableError } = vi.hoisted(() => {
	class SessionUnavailableError extends Error {
		readonly status: number | null
		readonly retryAfter: string | null

		constructor(status: number | null, retryAfter: string | null) {
			super("Session read unavailable")
			this.name = "SessionUnavailableError"
			this.status = status
			this.retryAfter = retryAfter
		}
	}

	return { getSession: vi.fn(), SessionUnavailableError }
})

vi.mock("@/services/better-auth/auth-server", () => ({
	getSession,
	SessionUnavailableError,
}))

vi.mock("@/services/tanstack-query/provider", () => ({
	CacheIdentityStamp: () => null,
}))

vi.mock("@/services/analytics/analytics-identity-stamp", () => ({
	AnalyticsIdentityStamp: () => null,
}))

/**
 * The user id each stamp was handed. The cache stamp and the analytics stamp
 * read the same session, so they must always receive the same id.
 */
function stampedIds(
	element: React.ReactElement<{ children: React.ReactElement<{ userId: string | null }>[] }>
) {
	return element.props.children.map(child => child.props.userId)
}

describe("CacheIdentity", () => {
	it("stamps the signed-in user", async () => {
		getSession.mockResolvedValue({ user: { id: "user-1" } })

		const element = await CacheIdentity()

		expect(stampedIds(element)).toEqual(["user-1", "user-1"])
	})

	it("stamps anonymous when the session read is unavailable", async () => {
		getSession.mockRejectedValue(new SessionUnavailableError(null, null))

		const element = await CacheIdentity()

		expect(stampedIds(element)).toEqual([null, null])
	})

	it("stamps anonymous when the visitor is signed out", async () => {
		getSession.mockResolvedValue(null)

		const element = await CacheIdentity()

		expect(stampedIds(element)).toEqual([null, null])
	})

	it("rethrows errors that are not a failed session read", async () => {
		getSession.mockRejectedValue(new Error("headers missing"))

		await expect(CacheIdentity()).rejects.toThrow("headers missing")
	})
})
