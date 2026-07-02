import { Controller, Get, Req, type INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import type { Application } from "express"
import { LoggerModule } from "nestjs-pino"
import pinoHttp from "pino-http"
import request from "supertest"
import { type App } from "supertest/types"

import { buildPinoHttpOptions } from "@/config/pino-logger.config"

// env.config validates required vars at module load (fail-fast). Jest's process
// env has none, so mock it — NODE_ENV must NOT be "development" (keeps pino-pretty
// off so captureStream receives parseable JSON), LOG_LEVEL "info" so req/res
// lines are emitted.
jest.mock("@/config/env.config", () => ({
	env: { NODE_ENV: "test", LOG_LEVEL: "info" },
	isApiDocsEnabled: () => false,
}))

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Controller()
class PingController {
	@Get("ping")
	ping(@Req() req: { id?: string | number }) {
		// Expose the id the request context (and thus the injectable logger) uses,
		// so a mismatch with the response header / logged id is observable.
		return { ok: true, id: req.id !== undefined && req.id !== null ? String(req.id) : null }
	}
}

describe("Request-Id (integration)", () => {
	let app: INestApplication<App>
	// Captures the request/response log lines emitted by the authoritative
	// (pre-Better-Auth) pino-http middleware, so we can assert the id it logs
	// matches the id the Nest route and the response header expose.
	let logLines: Array<Record<string, unknown>>

	beforeEach(async () => {
		logLines = []
		const captureStream = {
			write(chunk: string) {
				try {
					logLines.push(JSON.parse(chunk) as Record<string, unknown>)
				} catch {
					// Ignore non-JSON output (e.g. pino-pretty in dev).
				}
			},
		}

		const moduleRef: TestingModule = await Test.createTestingModule({
			// Mirrors app.module.ts: LoggerModule registers its own pino-http
			// middleware with autoLogging off. Its genReqId must reuse the id the
			// authoritative middleware already put on req.id.
			imports: [LoggerModule.forRoot({ pinoHttp: buildPinoHttpOptions({ autoLogging: false }) })],
			controllers: [PingController],
		}).compile()

		app = moduleRef.createNestApplication()

		// Mirror bootstrap.ts: the authoritative pino-http middleware runs first,
		// assigns/echoes X-Request-Id and logs request/response (to captureStream).
		const expressApp = app.getHttpAdapter().getInstance() as Application
		expressApp.use(pinoHttp(buildPinoHttpOptions(), captureStream))

		await app.init()
	})

	afterEach(async () => {
		await app.close()
	})

	const server = () => app.getHttpServer()

	const loggedIds = () =>
		logLines
			.map(line => (line.req as { id?: unknown } | undefined)?.id)
			.filter((id): id is string | number => id !== undefined && id !== null)
			.map(String)

	it("mints a UUID X-Request-Id when none is provided", async () => {
		const res = await request(server()).get("/ping")

		expect(res.status).toBe(200)
		expect(res.headers["x-request-id"]).toBeDefined()
		expect(res.headers["x-request-id"]).toMatch(UUID_RE)
	})

	it("echoes an inbound X-Request-Id unchanged", async () => {
		const res = await request(server()).get("/ping").set("X-Request-Id", "my-trace-id")

		expect(res.status).toBe(200)
		expect(res.headers["x-request-id"]).toBe("my-trace-id")
	})

	it("uses one correlation id across the log line, the Nest route, and the response header", async () => {
		const res = await request(server()).get("/ping")

		expect(res.status).toBe(200)

		const headerId = res.headers["x-request-id"]
		expect(headerId).toMatch(UUID_RE)

		// The id the Nest-routed controller (and the injectable logger) sees must
		// match the id echoed to the client. A second pino-http middleware minting
		// a fresh UUID would break this.
		expect(res.body.id).toBe(headerId)

		// The authoritative middleware's request/response log line must carry the
		// SAME id — otherwise the client-visible header and the log disagree.
		const ids = loggedIds()
		expect(ids.length).toBeGreaterThan(0)
		for (const id of ids) {
			expect(id).toBe(headerId)
		}
	})

	it("keeps the inbound id consistent across log line, route, and header", async () => {
		const res = await request(server()).get("/ping").set("X-Request-Id", "trace-42")

		expect(res.status).toBe(200)
		expect(res.headers["x-request-id"]).toBe("trace-42")
		expect(res.body.id).toBe("trace-42")

		const ids = loggedIds()
		expect(ids.length).toBeGreaterThan(0)
		for (const id of ids) {
			expect(id).toBe("trace-42")
		}
	})
})
