import { beforeEach, describe, expect, it, vi } from "vitest"

import { resetAnalyticsIdentity, syncAnalyticsIdentity, type PosthogLike } from "./posthog-identity"

/** A stand-in PostHog client that records the identity calls in order. */
function fakeClient() {
	const calls: string[] = []
	const client: PosthogLike = {
		identify: vi.fn((id: string) => {
			calls.push(`identify:${id}`)
		}),
		reset: vi.fn(() => {
			calls.push("reset")
		}),
	}
	return { client, calls }
}

describe("syncAnalyticsIdentity", () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	it("identifies on first sign-in with the user id and nothing else", () => {
		const { client } = fakeClient()

		syncAnalyticsIdentity("u1", client, true)

		expect(client.identify).toHaveBeenCalledWith("u1")
		expect(client.reset).not.toHaveBeenCalled()
	})

	it("does nothing when the same user is seen again", () => {
		const { client } = fakeClient()
		syncAnalyticsIdentity("u1", client, true)

		syncAnalyticsIdentity("u1", client, true)

		expect(client.identify).toHaveBeenCalledTimes(1)
	})

	it("resets before identifying a different user on the same browser", () => {
		const { client, calls } = fakeClient()
		syncAnalyticsIdentity("u1", client, true)

		syncAnalyticsIdentity("u2", client, true)

		expect(calls).toEqual(["identify:u1", "reset", "identify:u2"])
	})

	it("resets once when a signed-in browser is seen signed out", () => {
		const { client, calls } = fakeClient()
		syncAnalyticsIdentity("u1", client, true)

		syncAnalyticsIdentity(null, client, true)
		syncAnalyticsIdentity(null, client, true)

		expect(calls).toEqual(["identify:u1", "reset"])
	})

	it("leaves an anonymous visitor alone, so their anonymous id is not rotated", () => {
		const { client } = fakeClient()

		syncAnalyticsIdentity(null, client, true)

		expect(client.reset).not.toHaveBeenCalled()
		expect(client.identify).not.toHaveBeenCalled()
	})

	it("never touches the client when analytics is off", () => {
		const { client } = fakeClient()

		syncAnalyticsIdentity("u1", client, false)
		resetAnalyticsIdentity(client, false)

		expect(client.identify).not.toHaveBeenCalled()
		expect(client.reset).not.toHaveBeenCalled()
	})
})

describe("resetAnalyticsIdentity", () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	it("resets and forgets the identified user", () => {
		const { client, calls } = fakeClient()
		syncAnalyticsIdentity("u1", client, true)

		resetAnalyticsIdentity(client, true)
		syncAnalyticsIdentity(null, client, true)

		expect(calls).toEqual(["identify:u1", "reset"])
	})
})
