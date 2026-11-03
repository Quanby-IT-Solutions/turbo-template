import { afterEach, describe, expect, it, vi } from "vitest"

import {
	createMemoryRateLimitStorage,
	rateLimitStorage,
	setAuthRateLimitStorage,
	type AuthRateLimitStorage,
} from "./rate-limit-storage.js"

const rule = { window: 10, max: 3 }

function clock(start = 1_000_000) {
	let now = start
	return {
		now: () => now,
		advance: (ms: number) => {
			now += ms
		},
	}
}

describe("createMemoryRateLimitStorage", () => {
	it("allows max hits then blocks", async () => {
		const time = clock()
		const storage = createMemoryRateLimitStorage({ now: time.now })

		for (let hit = 0; hit < 3; hit++) {
			await expect(storage.consume("k", rule)).resolves.toEqual({
				allowed: true,
				retryAfter: null,
			})
		}
		await expect(storage.consume("k", rule)).resolves.toEqual({ allowed: false, retryAfter: 10 })
	})

	it("retryAfter counts down", async () => {
		const time = clock()
		const storage = createMemoryRateLimitStorage({ now: time.now })
		for (let hit = 0; hit < 4; hit++) await storage.consume("k", rule)

		time.advance(4_000)

		await expect(storage.consume("k", rule)).resolves.toEqual({ allowed: false, retryAfter: 6 })
	})

	it("window resets after elapsed", async () => {
		const time = clock()
		const storage = createMemoryRateLimitStorage({ now: time.now })
		for (let hit = 0; hit < 4; hit++) await storage.consume("k", rule)

		time.advance(10_000)

		await expect(storage.consume("k", rule)).resolves.toEqual({ allowed: true, retryAfter: null })
	})

	it("keys are independent", async () => {
		const storage = createMemoryRateLimitStorage({ now: clock().now })
		for (let hit = 0; hit < 4; hit++) await storage.consume("a", rule)

		await expect(storage.consume("b", rule)).resolves.toEqual({ allowed: true, retryAfter: null })
	})

	it("evicts beyond maxEntries", async () => {
		const storage = createMemoryRateLimitStorage({ now: clock().now, maxEntries: 2 })
		for (let hit = 0; hit < 4; hit++) await storage.consume("a", rule)
		await storage.consume("b", rule)
		await storage.consume("c", rule)

		// "a" was the oldest entry, so it was evicted and starts a fresh window.
		await expect(storage.consume("a", rule)).resolves.toEqual({ allowed: true, retryAfter: null })
	})
})

describe("rateLimitStorage", () => {
	afterEach(() => setAuthRateLimitStorage(null))

	it("delegates to the registered storage", async () => {
		const result = { allowed: false, retryAfter: 7 }
		const fake: AuthRateLimitStorage = { consume: vi.fn().mockResolvedValue(result) }
		setAuthRateLimitStorage(fake)

		await expect(rateLimitStorage.consume("k", rule)).resolves.toBe(result)
		expect(fake.consume).toHaveBeenCalledWith("k", rule)
	})

	it("falls back after unregister", async () => {
		const fake: AuthRateLimitStorage = {
			consume: vi.fn().mockResolvedValue({ allowed: false, retryAfter: 7 }),
		}
		setAuthRateLimitStorage(fake)
		setAuthRateLimitStorage(null)

		await expect(rateLimitStorage.consume("fallback-key", rule)).resolves.toEqual({
			allowed: true,
			retryAfter: null,
		})
		expect(fake.consume).not.toHaveBeenCalled()
	})
})
