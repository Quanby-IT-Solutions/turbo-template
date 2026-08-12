import { Logger } from "@nestjs/common"

import { ResilientThrottlerStorage } from "@/common/redis/resilient-throttler.storage"

/**
 * AB-2 / F-38 — the throttler's fail-open degradation.
 *
 * The unwrapped Redis storage propagates connection errors and the
 * ThrottlerGuard turns them into a 500, so a Redis outage became a total
 * outage. Verified directly before this wrapper existed: health, sign-in and
 * permission checks all returned 500 with Redis unreachable.
 */

beforeAll(() => {
	jest.spyOn(Logger.prototype, "error").mockImplementation(() => {})
	jest.spyOn(Logger.prototype, "log").mockImplementation(() => {})
})

afterAll(() => {
	jest.restoreAllMocks()
})

const RECORD = { totalHits: 3, timeToExpire: 42, isBlocked: false, timeToBlockExpire: 0 }

describe("ResilientThrottlerStorage", () => {
	it("passes through the real record while Redis is healthy", async () => {
		const inner = { increment: jest.fn().mockResolvedValue(RECORD) }

		await expect(
			new ResilientThrottlerStorage(inner).increment("k", 60, 10, 0, "default")
		).resolves.toEqual(RECORD)
	})

	it("forwards every argument unchanged", async () => {
		const inner = { increment: jest.fn().mockResolvedValue(RECORD) }

		await new ResilientThrottlerStorage(inner).increment("key", 60, 10, 5, "strict")

		expect(inner.increment).toHaveBeenCalledWith("key", 60, 10, 5, "strict")
	})

	it("admits the request when the store is unreachable", async () => {
		const inner = { increment: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) }

		const record = await new ResilientThrottlerStorage(inner).increment("k", 60, 10, 0, "default")

		// Reads as "well under the limit", so the guard lets the request through
		// instead of turning a counter outage into a service outage.
		expect(record.isBlocked).toBe(false)
		expect(record.totalHits).toBe(0)
		expect(record.timeToExpire).toBe(60)
	})

	it("never throws, whatever the store does", async () => {
		const inner = { increment: jest.fn().mockRejectedValue("not even an Error") }

		await expect(
			new ResilientThrottlerStorage(inner).increment("k", 60, 10, 0, "default")
		).resolves.toBeDefined()
	})

	it("logs the outage once, not once per request", async () => {
		const errorSpy = jest.spyOn(Logger.prototype, "error")
		errorSpy.mockClear()

		const inner = { increment: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) }
		const storage = new ResilientThrottlerStorage(inner)

		for (let i = 0; i < 5; i++) {
			await storage.increment("k", 60, 10, 0, "default")
		}

		expect(errorSpy).toHaveBeenCalledTimes(1)
	})

	it("reports recovery and resumes enforcing once the store returns", async () => {
		const logSpy = jest.spyOn(Logger.prototype, "log")
		logSpy.mockClear()

		const inner = {
			increment: jest
				.fn()
				.mockRejectedValueOnce(new Error("ECONNREFUSED"))
				.mockResolvedValue(RECORD),
		}
		const storage = new ResilientThrottlerStorage(inner)

		await storage.increment("k", 60, 10, 0, "default")
		const recovered = await storage.increment("k", 60, 10, 0, "default")

		expect(recovered).toEqual(RECORD)
		expect(logSpy).toHaveBeenCalledTimes(1)
	})
})
