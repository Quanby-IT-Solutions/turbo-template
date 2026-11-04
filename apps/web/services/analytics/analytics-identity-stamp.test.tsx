import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const syncAnalyticsIdentity = vi.fn()

vi.mock("@/services/analytics/posthog-identity", () => ({
	syncAnalyticsIdentity: (userId: string | null) => syncAnalyticsIdentity(userId),
}))

const { AnalyticsIdentityStamp } = await import("./analytics-identity-stamp")

describe("AnalyticsIdentityStamp", () => {
	it("syncs PostHog with the session's user id, and again when it changes", () => {
		const { rerender } = render(<AnalyticsIdentityStamp userId="u1" />)
		rerender(<AnalyticsIdentityStamp userId={null} />)

		expect(syncAnalyticsIdentity.mock.calls).toEqual([["u1"], [null]])
	})

	it("renders nothing", () => {
		const { container } = render(<AnalyticsIdentityStamp userId="u1" />)

		expect(container).toBeEmptyDOMElement()
	})
})
