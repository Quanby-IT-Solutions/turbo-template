import { Controller, Get, HttpException, Post, type INestApplication } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"
import { ThrottlerException, ThrottlerModule } from "@nestjs/throttler"
import { readFileSync } from "fs"
import { join } from "path"
import type { Application, NextFunction, Request, Response } from "express"
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
		it("returns the single proxy-authored IP when the trusted hop wrote one entry", async () => {
			await expect(guard["getTracker"]({ ips: ["1.2.3.4"], ip: "1.2.3.4" })).resolves.toBe(
				"1.2.3.4"
			)
		})

		// AB-1 / F-02: req.ips is ordered upstream-most -> downstream-most, so the
		// LEFTMOST entries are the client-writable ones. Keying on ips[0] would let
		// a caller mint a bucket per request.
		it("uses the rightmost-untrusted entry, never the client-writable leftmost one", async () => {
			await expect(
				guard["getTracker"]({ ips: ["1.2.3.4", "5.6.7.8", "203.0.113.9"], ip: "203.0.113.9" })
			).resolves.toBe("203.0.113.9")
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

// ---------------------------------------------------------------------------
// AB-1 / F-02 — forged X-Forwarded-For must not mint fresh rate-limit buckets.
//
// The control is a CHAIN, so it is tested as one (Risky Flow RF2):
//   1. Nginx SETS X-Forwarded-For to $remote_addr (overwrite, not append), and
//   2. the app runs with `trust proxy` = 1 (exactly one hop), so Express keeps
//      only that proxy-authored entry in req.ips, and
//   3. the guard keys on the rightmost-untrusted entry.
// ---------------------------------------------------------------------------

const buildProxiedApp = async (options: {
	overwriteForwardedFor: boolean
}): Promise<INestApplication<App>> => {
	const moduleRef: TestingModule = await Test.createTestingModule({
		imports: [
			LoggerModule.forRoot({ pinoHttp: buildPinoHttpOptions({ autoLogging: false }) }),
			ThrottlerModule.forRoot([{ name: "default", ttl: TTL, limit: DEFAULT_LIMIT }]),
		],
		controllers: [ThrottleTestController],
		providers: [
			{ provide: APP_GUARD, useClass: ThrottlerProxyGuard },
			{ provide: APP_FILTER, useClass: HttpExceptionFilter },
		],
	}).compile()

	const app: INestApplication<App> = moduleRef.createNestApplication()
	const expressApp = app.getHttpAdapter().getInstance() as Application

	// Deployed topology: a single trusted proxy hop in front of the app.
	expressApp.set("trust proxy", 1)

	if (options.overwriteForwardedFor) {
		// Stand-in for `proxy_set_header X-Forwarded-For $remote_addr;`.
		expressApp.use((req: Request, _res: Response, next: NextFunction) => {
			req.headers["x-forwarded-for"] = req.socket.remoteAddress
			next()
		})
	}

	await app.init()
	return app
}

describe("ThrottlerProxyGuard forged X-Forwarded-For (AB-1)", () => {
	let app: INestApplication<App>

	afterEach(async () => {
		await app.close()
	})

	it("collapses forged headers into ONE bucket when the proxy overwrites X-Forwarded-For", async () => {
		app = await buildProxiedApp({ overwriteForwardedFor: true })

		// Every request forges a DIFFERENT chain. If the header were trusted, each
		// would open its own bucket and none would ever be throttled.
		for (let i = 0; i < DEFAULT_LIMIT; i++) {
			await request(app.getHttpServer())
				.get("/read")
				.set("X-Forwarded-For", `1.2.3.${i}, 5.6.7.${i}`)
				.expect(200)
		}

		const res = await request(app.getHttpServer())
			.get("/read")
			.set("X-Forwarded-For", "1.2.3.99, 5.6.7.99")

		expect(res.status).toBe(429)
	})

	it("proves the Nginx overwrite is load-bearing: without it forged headers split the bucket", async () => {
		app = await buildProxiedApp({ overwriteForwardedFor: false })

		// Same traffic, but the proxy appended instead of overwriting: the
		// rightmost-untrusted entry is now attacker-chosen, so each request lands
		// in its own bucket and the limit never bites. This is the failure mode
		// nginx.conf's `$remote_addr` directive exists to prevent.
		for (let i = 0; i < DEFAULT_LIMIT + 2; i++) {
			await request(app.getHttpServer())
				.get("/read")
				.set("X-Forwarded-For", `1.2.3.${i}, 5.6.7.${i}`)
				.expect(200)
		}
	})
})

// Both shipped configs, not just production. nginx.dev.conf is the default a
// fresh clone runs — the compose mount falls back to it — so a regression there
// reaches far more people than one in nginx.conf, and only this file was
// covered. The trust chain (RF2) is only sound while EVERY proxy that fronts
// the app overwrites the header.
describe.each([["nginx.conf"], ["nginx.dev.conf"]])(
	"%s client-IP directives (AB-1)",
	(configFile: string) => {
		const conf = readFileSync(join(__dirname, "../../../../../nginx", configFile), "utf8")
		const activeLines = conf
			.split("\n")
			.map(line => line.trim())
			.filter(line => !line.startsWith("#"))

		it("sets X-Forwarded-For to $remote_addr at every active proxy location", () => {
			const forwardedFor = activeLines.filter(line => line.includes("X-Forwarded-For"))

			expect(forwardedFor.length).toBeGreaterThanOrEqual(2)
			for (const line of forwardedFor) {
				expect(line).toBe("proxy_set_header X-Forwarded-For $remote_addr;")
			}
		})

		// Comments are allowed to name the directive (they explain why it is banned);
		// no *executable* line may use it.
		it("never appends via $proxy_add_x_forwarded_for", () => {
			expect(activeLines.filter(line => line.includes("$proxy_add_x_forwarded_for"))).toEqual([])
		})
	}
)
