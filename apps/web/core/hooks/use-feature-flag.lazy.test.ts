import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useFeatureFlag } from "./use-feature-flag"

vi.mock("@/core/lib/posthog-client", () => ({
	loadedPosthog: () => undefined,
	loadPosthog: () =>
		Promise.resolve({
			isFeatureEnabled: (key: string) => key === "template-preview",
			onFeatureFlags: () => () => {},
		}),
}))

describe("useFeatureFlag with the lazily loaded client", () => {
	it("reads the flag once PostHog has loaded", async () => {
		const { result } = renderHook(() => useFeatureFlag("template-preview", undefined, true))

		await waitFor(() => expect(result.current).toBe(true))
	})

	it("stays off and loads nothing when PostHog is off", () => {
		const { result } = renderHook(() => useFeatureFlag("template-preview", undefined, false))

		expect(result.current).toBe(false)
	})
})
