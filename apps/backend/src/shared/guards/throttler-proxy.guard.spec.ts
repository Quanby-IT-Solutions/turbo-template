import { Controller, Get, HttpException, Post, type INestApplication } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"
import { ThrottlerException, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"
import request from "supertest"
import { type App } from "supertest/types"

import { HttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { buildPinoHttpOptions } from "@/config/pino-logger.config"
import { skipStrictThrottle, StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"
import { ThrottlerProxyGuard } from "@/shared/guards/throttler-proxy.guard"

// buildPinoHttpOptions -> env.config validates required vars at load; Jest's env
// has none. Mock env.config (NODE_ENV != "development" disables pino-pretty).
jest.mock("@/config/env.config", () => ({
	env: { NODE_ENV: "test", LOG_LEVEL: "info" },
	isApiDocsEnabled: () => false,
}))

// Small limits so tests can exhaust each window in a handful of requests.
const DEFAULT_LIMIT = 3
const STRICT_LIMIT = 2
const TTL = 60_000

// Undecorated read + strict-decorated mutation exercise the default-vs-strict
// split end to end.
@Controller()
class ThrottleTestController {
	@Get("read")
	read() {
		return { ok: true }
	}

	@StrictThrottle()
	@Post("mutate")
	mutate() {
		return { ok: true }
	}
}

describe("ThrottlerProxyGuard (unit)", () => {
	let guard: ThrottlerProxyGuard

	beforeEach(() => {
		// Base ThrottlerGuard's real constructor needs (options, storage, reflector);
		// getTracker is pure so it can run on a bare instance.
		guard = Object.create(ThrottlerProxyGuard.prototype) as ThrottlerProxyGuard
	})

	describe("getTracker", () => {
		it("returns the first proxy-forwarded IP from req.ips", async () => {
			await expect(guard["getTracker"]({ ips: ["1.2.3.4"], ip: "10.0.0.1" })).resolves.toBe(
				"1.2.3.4"
			)
		})

		it("falls back to req.ip when req.ips is empty", async () => {
			await expect(guard["getTracker"]({ ips: [], ip: "5.6.7.8" })).resolves.toBe("5.6.7.8")
		})

		it("falls back to req.ip when req.ips is undefined", async () => {
			await expect(guard["getTracker"]({ ips: undefined, ip: "9.9.9.9" })).resolves.toBe("9.9.9.9")
		})
	})

	describe("429 response shape", () => {
		it("ThrottlerException is an HttpException so HttpExceptionFilter renders it", () => {
			expect(new ThrottlerException()).toBeInstanceOf(HttpException)
		})
	})
})

describe("ThrottlerProxyGuard (integration)", () => {
	let app: INestApplication<App>

	beforeEach(async () => {
		const moduleRef: TestingModule = await Test.createTestingModule({
			imports: [
				LoggerModule.forRoot({ pinoHttp: buildPinoHttpOptions({ autoLogging: false }) }),
				ThrottlerModule.forRoot([
					{ name: "default", ttl: TTL, limit: DEFAULT_LIMIT },
					// Opt-in only, mirroring app.module.ts.
					{ name: "strict", ttl: TTL, limit: STRICT_LIMIT, skipIf: skipStrictThrottle },
				]),
			],
			controllers: [ThrottleTestController],
			providers: [
				{ provide: APP_GUARD, useClass: ThrottlerProxyGuard },
				{ provide: APP_FILTER, useClass: HttpExceptionFilter },
			],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()
	})

	afterEach(async () => {
		await app.close()
	})

	const server = () => app.getHttpServer()

	it("allows an under-limit read request", async () => {
		const res = await request(server()).get("/read")
		expect(res.status).toBe(200)
		expect(res.body).toEqual({ ok: true })
	})

	it("returns a 429 in the { success, error, timestamp } shape with Retry-After once the default limit is exceeded", async () => {
		// Consume the full default window.
		for (let i = 0; i < DEFAULT_LIMIT; i++) {
			await request(server()).get("/read").expect(200)
		}

		const res = await request(server()).get("/read")

		expect(res.status).toBe(429)
		expect(res.headers["retry-after"]).toBeDefined()
		expect(res.body.success).toBe(false)
		expect(res.body.error).toBeDefined()
		expect(res.body.error.code).toBe("ThrottlerException")
		expect(typeof res.body.timestamp).toBe("string")
	})

	it("allows an under-limit strict mutation", async () => {
		const res = await request(server()).post("/mutate")
		expect([200, 201]).toContain(res.status)
		expect(res.body).toEqual({ ok: true })
	})

	it("returns a 429 with Retry-After once the strict limit is exceeded", async () => {
		for (let i = 0; i < STRICT_LIMIT; i++) {
			const ok = await request(server()).post("/mutate")
			expect([200, 201]).toContain(ok.status)
		}

		const res = await request(server()).post("/mutate")

		expect(res.status).toBe(429)
		// Named throttlers suffix their headers with `-<name>`.
		expect(res.headers["retry-after-strict"]).toBeDefined()
		expect(res.body.success).toBe(false)
		expect(res.body.error.code).toBe("ThrottlerException")
		expect(typeof res.body.timestamp).toBe("string")
	})

	it("does not consume the strict quota on reads (default and strict windows are independent)", async () => {
		// Exhaust the read window and trigger a read 429.
		for (let i = 0; i < DEFAULT_LIMIT; i++) {
			await request(server()).get("/read").expect(200)
		}
		await request(server()).get("/read").expect(429)

		// Strict budget is untouched: every strict-limited mutation still succeeds.
		for (let i = 0; i < STRICT_LIMIT; i++) {
			const ok = await request(server()).post("/mutate")
			expect([200, 201]).toContain(ok.status)
		}
	})
})
