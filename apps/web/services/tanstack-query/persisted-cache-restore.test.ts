import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	isPersistedCacheRestoring,
	markPersistedCacheRestored,
	markPersistedCacheRestoring,
	PERSISTED_CACHE_RESTORE_WARN_MS,
} from "./persisted-cache-restore"

const WARN_MESSAGE =
	"Restoring the offline cache is taking longer than expected. Changes on this page won't be saved to the offline cache until it finishes."

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	vi.useFakeTimers()
	markPersistedCacheRestored()
	warn = vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
	markPersistedCacheRestored()
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("persisted cache restore warning", () => {
	it("warns once after the delay and leaves the restore flag set", async () => {
		markPersistedCacheRestoring()

		await vi.advanceTimersByTimeAsync(PERSISTED_CACHE_RESTORE_WARN_MS)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(WARN_MESSAGE)
		expect(isPersistedCacheRestoring()).toBe(true)
	})

	it("does not warn when restore finishes before the delay", async () => {
		markPersistedCacheRestoring()
		markPersistedCacheRestored()

		await vi.advanceTimersByTimeAsync(PERSISTED_CACHE_RESTORE_WARN_MS)

		expect(warn).not.toHaveBeenCalled()
		expect(isPersistedCacheRestoring()).toBe(false)
	})

	it("warns once when restore is armed twice", async () => {
		markPersistedCacheRestoring()
		markPersistedCacheRestoring()

		await vi.advanceTimersByTimeAsync(PERSISTED_CACHE_RESTORE_WARN_MS)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(isPersistedCacheRestoring()).toBe(true)
	})
})
