import { beforeEach, describe, expect, it, vi } from "vitest"

import { resetAnalyticsIdentity, syncAnalyticsIdentity } from "./posthog-identity"

const fake = vi.hoisted(() => ({
	client: { identify: vi.fn(), reset: vi.fn() },
	loaded: true,
}))

vi.mock("@/core/lib/posthog-client", () => ({
	loadedPosthog: () => (fake.loaded ? fake.client : undefined),
	loadPosthog: () => Promise.resolve(fake.client),
}))

describe("identity with the lazily loaded client", () => {
	beforeEach(() => {
		fake.client.identify.mockClear()
		fake.client.reset.mockClear()
		window.localStorage.clear()
	})

	it("resets before returning once PostHog has loaded, so sign-out's next pageview is anonymous", () => {
		fake.loaded = true

		resetAnalyticsIdentity(undefined, true)

		expect(fake.client.reset).toHaveBeenCalledWith(true)
	})

	it("waits for PostHog when it has not loaded yet", async () => {
		fake.loaded = false

		syncAnalyticsIdentity("user-1", undefined, true)
		expect(fake.client.identify).not.toHaveBeenCalled()

		await vi.waitFor(() => expect(fake.client.identify).toHaveBeenCalledWith("user-1"))
	})
})
