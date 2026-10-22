import { Controller, Get, Logger, type INestApplication } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import request from "supertest"
import { type App } from "supertest/types"

import { ResilientThrottlerStorage } from "@/common/redis/resilient-throttler.storage"

/**
 * The throttler's fail-open degradation.
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

		const record = await new ResilientThrottlerStorage(inner).increment(
			"k",
			60_000,
			10,
			0,
			"default"
		)

		// Reads as "well under the limit", so the guard lets the request through
		// instead of turning a counter outage into a service outage. The reset
		// is in seconds, the same unit the healthy store reports for this ttl.
		expect(record).toEqual({
			totalHits: 0,
			timeToExpire: 60,
			isBlocked: false,
			timeToBlockExpire: 0,
		})
	})

	it("rounds a 1500 ms ttl up to 2 seconds when it fails open", async () => {
		const inner = { increment: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) }

		const record = await new ResilientThrottlerStorage(inner).increment("k", 1500, 10, 0, "default")

		expect(record.timeToExpire).toBe(2)
		expect(record.timeToExpire).toBe(Math.ceil(1500 / 1000))
		expect(record.isBlocked).toBe(false)
		expect(record.timeToBlockExpire).toBe(0)
	})

	it("never throws, whatever the store does", async () => {
		const inner = { increment: jest.fn().mockRejectedValue("not even an Error") }

		await expect(
			new ResilientThrottlerStorage(inner).increment("k", 60, 10, 0, "default")
		).resolves.toBeDefined()
	})

	it("fails open without the outage log when the client was closed on purpose", async () => {
		const errorSpy = jest.spyOn(Logger.prototype, "error")
		errorSpy.mockClear()

		const inner = {
			redis: { status: "end" },
			increment: jest.fn().mockRejectedValue(new Error("Connection is closed.")),
		}

		const record = await new ResilientThrottlerStorage(inner).increment(
			"k",
			60_000,
			10,
			0,
			"default"
		)

		expect(record).toEqual({
			totalHits: 0,
			timeToExpire: 60,
			isBlocked: false,
			timeToBlockExpire: 0,
		})
		expect(errorSpy).not.toHaveBeenCalled()
	})

	it("still logs a real outage once when the client is reconnecting", async () => {
		const errorSpy = jest.spyOn(Logger.prototype, "error")
		errorSpy.mockClear()

		const inner = {
			redis: { status: "reconnecting" },
			increment: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
		}
		const storage = new ResilientThrottlerStorage(inner)

		const first = await storage.increment("k", 60, 10, 0, "default")
		const second = await storage.increment("k", 60, 10, 0, "default")

		expect(first.isBlocked).toBe(false)
		expect(first.totalHits).toBe(0)
		expect(second.isBlocked).toBe(false)
		expect(errorSpy).toHaveBeenCalledTimes(1)
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

@Controller()
class FailOpenProbeController {
	@Get("probe")
	probe() {
		return { ok: true }
	}
}

describe("fail-open rate-limit header", () => {
	const ttl = 60_000

	async function boot(storage: ResilientThrottlerStorage): Promise<INestApplication<App>> {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ThrottlerModule.forRoot({
					throttlers: [{ name: "default", ttl, limit: 10 }],
					storage,
				}),
			],
			controllers: [FailOpenProbeController],
			providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
		}).compile()
		const app = moduleRef.createNestApplication<INestApplication<App>>()
		await app.init()
		return app
	}

	it("sends X-RateLimit-Reset in seconds and no Retry-After when the store fails open", async () => {
		const healthy = new ResilientThrottlerStorage({
			increment: jest.fn().mockResolvedValue({
				totalHits: 1,
				timeToExpire: Math.ceil(ttl / 1000),
				isBlocked: false,
				timeToBlockExpire: 0,
			}),
		})
		const failing = new ResilientThrottlerStorage({
			increment: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
		})

		const healthyApp = await boot(healthy)
		const failingApp = await boot(failing)
		try {
			const admitted = await request(healthyApp.getHttpServer()).get("/probe")
			const opened = await request(failingApp.getHttpServer()).get("/probe")

			expect(admitted.status).toBe(200)
			expect(opened.status).toBe(200)
			expect(opened.headers["x-ratelimit-reset"]).toBe("60")
			expect(opened.headers["x-ratelimit-reset"]).toBe(admitted.headers["x-ratelimit-reset"])
			expect(opened.headers["retry-after"]).toBeUndefined()
		} finally {
			await healthyApp.close()
			await failingApp.close()
		}
	})
})
