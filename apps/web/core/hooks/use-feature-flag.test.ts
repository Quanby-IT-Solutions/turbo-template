import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useFeatureFlag, type FlagClient } from "./use-feature-flag"

/** A stand-in PostHog client whose flags load when the test says so. */
function fakeClient() {
	let flags: Record<string, boolean> = {}
	const listeners = new Set<() => void>()
	const unsubscribe = vi.fn()

	const client: FlagClient = {
		isFeatureEnabled: vi.fn((key: string) => flags[key]),
		onFeatureFlags: vi.fn((callback: () => void) => {
			listeners.add(callback)
			return () => {
				listeners.delete(callback)
				unsubscribe()
			}
		}),
	}

	const load = (next: Record<string, boolean>) => {
		flags = next
		for (const listener of listeners) listener()
	}

	return { client, load, unsubscribe }
}

describe("useFeatureFlag", () => {
	it("reads off and never subscribes when analytics is off", () => {
		const { client } = fakeClient()

		const { result } = renderHook(() => useFeatureFlag("template-preview", client, false))

		expect(result.current).toBe(false)
		expect(client.onFeatureFlags).not.toHaveBeenCalled()
	})

	it("reads off before flags load, then on once they load with the flag on", () => {
		const { client, load } = fakeClient()

		const { result } = renderHook(() => useFeatureFlag("template-preview", client, true))
		expect(result.current).toBe(false)

		act(() => load({ "template-preview": true }))

		expect(result.current).toBe(true)
	})

	it("stops listening when the component unmounts", () => {
		const { client, unsubscribe } = fakeClient()

		const { unmount } = renderHook(() => useFeatureFlag("template-preview", client, true))
		unmount()

		expect(unsubscribe).toHaveBeenCalled()
	})
})
