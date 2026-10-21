import * as Sentry from "@sentry/nestjs"
import express from "express"
import { pinoHttp } from "pino-http"
import request from "supertest"

import { buildPinoHttpOptions } from "@/config/pino-logger.config"
import { tagAssignedRequestId } from "@/config/sentry-request-id"

// env.config validates required vars at module load. NODE_ENV must not be
// "development" here: that turns pino-pretty on, and this spec wants the
// middleware that assigns `req.id`, not a pretty transport.
jest.mock("@/config/env.config", () => ({
	env: { NODE_ENV: "test", LOG_LEVEL: "info" },
	isApiDocsEnabled: () => false,
}))

const VALID_DSN = "https://abc123@o4507.ingest.sentry.io/1234567"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe("tagAssignedRequestId when Sentry is not initialised", () => {
	it("does not write request_id onto the default isolation scope", () => {
		expect(Sentry.isInitialized()).toBe(false)

		const req = { id: "trace-should-not-stick" }
		tagAssignedRequestId(req as never, {} as never, () => undefined)

		expect(Sentry.getIsolationScope().getScopeData().tags.request_id).toBeUndefined()
	})
})

describe("tagAssignedRequestId with Sentry initialised", () => {
	const captured: Array<Record<string, any>> = []

	beforeAll(() => {
		Sentry.init({
			dsn: VALID_DSN,
			tracesSampleRate: 1,
			sendDefaultPii: false,
			sendClientReports: false,
			beforeSend(event) {
				captured.push(JSON.parse(JSON.stringify(event)) as Record<string, any>)
				return null
			},
			beforeSendTransaction(event) {
				captured.push(JSON.parse(JSON.stringify(event)) as Record<string, any>)
				return null
			},
		})
	})

	afterAll(async () => {
		await Sentry.close(2000)
	})

	beforeEach(() => {
		captured.length = 0
	})

	function createApp() {
		const app = express()
		const stream = { write() {} }
		app.use(pinoHttp({ ...buildPinoHttpOptions(), transport: undefined }, stream))
		app.use(tagAssignedRequestId)
		app.get("/boom", (req, res) => {
			Sentry.captureException(new Error("boom"))
			res.status(500).json({ id: String(req.id) })
		})
		app.get("/ok", (_req, res) => {
			res.status(200).json({ ok: true })
		})
		return app
	}

	async function waitFor(predicate: () => boolean): Promise<void> {
		const start = Date.now()
		while (!predicate()) {
			if (Date.now() - start > 2000) {
				throw new Error("timed out waiting for a Sentry event")
			}
			await new Promise(resolve => setTimeout(resolve, 20))
		}
	}

	it("tags an error captured during the request with that request's req.id", async () => {
		const raw = "z".repeat(65)
		const app = createApp()

		const response = await request(app).get("/boom").set("X-Request-Id", raw)
		await waitFor(() => captured.some(event => event.exception))

		const error = captured.find(event => event.exception)
		expect(response.body.id).toMatch(UUID_RE)
		expect(response.headers["x-request-id"]).toBe(response.body.id)
		expect(error?.tags?.request_id).toBe(response.body.id)
		expect(JSON.stringify(error?.tags)).not.toContain(raw)
	})

	it("tags each request with its own id", async () => {
		const app = createApp()

		const [first, second] = await Promise.all([
			request(app).get("/boom").set("X-Request-Id", "trace-aaa"),
			request(app).get("/boom").set("X-Request-Id", "trace-bbb"),
		])
		await waitFor(() => captured.filter(event => event.exception).length >= 2)

		const tags = captured
			.filter(event => event.exception)
			.map(event => event.tags?.request_id)
			.filter(id => id === "trace-aaa" || id === "trace-bbb")

		expect(first.headers["x-request-id"]).toBe("trace-aaa")
		expect(second.headers["x-request-id"]).toBe("trace-bbb")
		expect(tags.filter(id => id === "trace-aaa")).toHaveLength(1)
		expect(tags.filter(id => id === "trace-bbb")).toHaveLength(1)
	})

	it("shows a transaction event carrying the inbound request id, which the scrub then removes", async () => {
		const inbound = "inbound-trace-id"
		const app = createApp()

		await request(app)
			.get("/ok")
			.set("X-Request-Id", inbound)
			.set("Authorization", "Bearer live-access-token")
			.set("X-Custom", "keep-me")
		await waitFor(() => captured.some(event => event.type === "transaction"))

		const transaction = captured.find(event => event.type === "transaction")
		expect(transaction?.request?.headers?.["x-request-id"]).toBe(inbound)
		expect(transaction?.request?.headers?.authorization).toBe("Bearer live-access-token")
		expect(transaction?.contexts?.trace?.data?.["http.request.header.x_request_id"]).toBe(inbound)

		const { scrubSentryEvent } = await import("@/instrument")
		const scrubbed = scrubSentryEvent(transaction as Sentry.Event)
		expect(scrubbed.request?.headers?.["x-request-id"]).toBeUndefined()
		expect(scrubbed.request?.headers?.authorization).toBeUndefined()
		expect(scrubbed.request?.headers?.["x-custom"]).toBe("keep-me")
		expect(scrubbed.contexts?.trace?.data?.["http.request.header.x_request_id"]).toBeUndefined()
		expect(JSON.stringify(scrubbed.request?.headers)).not.toContain(inbound)
		expect(JSON.stringify(scrubbed.request?.headers)).not.toContain("live-access-token")
		expect(JSON.stringify(scrubbed.contexts?.trace?.data)).not.toContain(inbound)
	})
})
