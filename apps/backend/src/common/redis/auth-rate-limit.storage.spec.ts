import { Logger } from "@nestjs/common"
import type Redis from "ioredis"

import {
	AUTH_RATE_LIMIT_SCRIPT,
	createRedisAuthRateLimitStorage,
} from "@/common/redis/auth-rate-limit.storage"

/**
 * Better Auth's limiter counting in the shared Redis.
 *
 * The Lua script itself runs against a real Redis in the live walk; these
 * tests pin how its reply is read and how a Redis failure is handled.
 */

const rule = { window: 10, max: 3 }

function client(status = "ready") {
	return { eval: jest.fn(), status } as unknown as Redis & { eval: jest.Mock }
}

let errorSpy: jest.SpyInstance
let logSpy: jest.SpyInstance

beforeEach(() => {
	errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {})
	logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => {})
})

afterEach(() => {
	jest.restoreAllMocks()
})

describe("createRedisAuthRateLimitStorage", () => {
	it("allows while count <= max", async () => {
		const redis = client()
		redis.eval.mockResolvedValue([3, 9000])

		await expect(createRedisAuthRateLimitStorage(redis).consume("k", rule)).resolves.toEqual({
			allowed: true,
			retryAfter: null,
		})
	})

	it("blocks above max with retryAfter from PTTL", async () => {
		const redis = client()
		redis.eval.mockResolvedValue([4, 6200])

		await expect(createRedisAuthRateLimitStorage(redis).consume("k", rule)).resolves.toEqual({
			allowed: false,
			retryAfter: 7,
		})
	})

	it("retryAfter is at least 1", async () => {
		const redis = client()
		redis.eval.mockResolvedValue([4, 0])

		await expect(createRedisAuthRateLimitStorage(redis).consume("k", rule)).resolves.toEqual({
			allowed: false,
			retryAfter: 1,
		})
	})

	it("namespaces keys and passes the window in seconds and the max", async () => {
		const redis = client()
		redis.eval.mockResolvedValue([1, 10000])

		await createRedisAuthRateLimitStorage(redis).consume("1.2.3.4|/sign-in/email", rule)

		expect(redis.eval).toHaveBeenCalledWith(
			AUTH_RATE_LIMIT_SCRIPT,
			1,
			"auth-rate-limit:1.2.3.4|/sign-in/email",
			"10",
			"3"
		)
	})

	it("re-arms a key that lost its TTL", () => {
		// Keyed on "no TTL" rather than "first hit": a key whose EXPIRE never
		// landed would otherwise lock that client out for good.
		// The script itself was also run against a real Redis before merge (see
		// the pull request), which a mocked client cannot do.
		expect(AUTH_RATE_LIMIT_SCRIPT).toContain("ttl < 0")
		expect(AUTH_RATE_LIMIT_SCRIPT).toContain("PEXPIRE")
		expect(AUTH_RATE_LIMIT_SCRIPT).not.toContain("== 1")
	})

	it("falls back to per-process limits when eval rejects", async () => {
		// A Redis outage must not remove the sign-in limit: each instance keeps
		// counting on its own, which is exactly the behaviour before Redis.
		const redis = client()
		redis.eval.mockRejectedValue(new Error("Connection is closed."))
		const storage = createRedisAuthRateLimitStorage(redis)

		for (let hit = 0; hit < 3; hit++) {
			await expect(storage.consume("k", rule)).resolves.toEqual({
				allowed: true,
				retryAfter: null,
			})
		}
		await expect(storage.consume("k", rule)).resolves.toEqual({ allowed: false, retryAfter: 10 })
		expect(errorSpy).toHaveBeenCalledTimes(1)
	})

	it("logs recovery once", async () => {
		const redis = client()
		redis.eval
			.mockRejectedValueOnce(new Error("down"))
			.mockResolvedValueOnce([1, 10000])
			.mockResolvedValueOnce([2, 9000])
		const storage = createRedisAuthRateLimitStorage(redis)

		await storage.consume("k", rule)
		await storage.consume("k", rule)
		await storage.consume("k", rule)

		expect(logSpy).toHaveBeenCalledTimes(1)
	})

	it("closed client falls back silently", async () => {
		const redis = client("end")
		redis.eval.mockRejectedValue(new Error("Connection is closed."))

		await expect(createRedisAuthRateLimitStorage(redis).consume("k", rule)).resolves.toEqual({
			allowed: true,
			retryAfter: null,
		})
		expect(errorSpy).not.toHaveBeenCalled()
	})
})
