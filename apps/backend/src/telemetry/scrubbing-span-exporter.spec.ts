import type { TraceState } from "@opentelemetry/api"
import { ExportResultCode, type ExportResult } from "@opentelemetry/core"
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base"

import { ScrubbingSpanExporter, scrubSpanAttributes } from "./scrubbing-span-exporter"

function spanWith(attributes: Record<string, unknown>): ReadableSpan {
	return {
		name: "GET /api/v1/example/todos",
		attributes,
		spanContext: () => ({ traceId: "t".repeat(32), spanId: "s".repeat(16), traceFlags: 1 }),
	} as unknown as ReadableSpan
}

function mapTraceState(entries: [string, string][]): TraceState {
	const state = new Map(entries)
	const make = (next: Map<string, string>): TraceState => ({
		set: (key, value) => make(new Map(next).set(key, value)),
		unset: key => {
			const copy = new Map(next)
			copy.delete(key)
			return make(copy)
		},
		get: key => next.get(key),
		serialize: () => [...next].map(([key, value]) => `${key}=${value}`).join(","),
	})
	return make(state)
}

/** An exporter that keeps what it is handed. */
function recordingExporter() {
	const received: ReadableSpan[][] = []
	const exporter: SpanExporter = {
		export: (spans, done: (result: ExportResult) => void) => {
			received.push(spans)
			done({ code: ExportResultCode.SUCCESS })
		},
		shutdown: jest.fn().mockResolvedValue(undefined),
		forceFlush: jest.fn().mockResolvedValue(undefined),
	}
	return { exporter, received }
}

describe("scrubSpanAttributes", () => {
	it.each([
		"http.request.header.authorization",
		"http.request.header.cookie",
		"http.request.header.x_request_id",
		"http.request.header.x-request-id",
	])("drops %s", key => {
		expect(scrubSpanAttributes({ [key]: ["secret"], "http.route": "/todos" })).toEqual({
			"http.route": "/todos",
		})
	})

	it("drops any attribute whose last segment is a deny-listed field", () => {
		expect(
			scrubSpanAttributes({ "db.params.password": "x", "app.user.email": "a@b.c", "keep": 1 })
		).toEqual({
			keep: 1,
		})
	})

	it.each(["url.full", "http.url", "http.target"])("redacts credential query params in %s", key => {
		expect(scrubSpanAttributes({ [key]: "https://h/reset-password?token=abc&lang=en" })[key]).toBe(
			"https://h/reset-password?token=[REDACTED]&lang=en"
		)
	})

	it("redacts credential params in url.query, which has no leading question mark", () => {
		expect(scrubSpanAttributes({ "url.query": "token=abc&lang=en" })["url.query"]).toBe(
			"token=[REDACTED]&lang=en"
		)
	})

	it("leaves unrelated attributes alone", () => {
		const attributes = { "http.route": "/todos", "http.response.status_code": 200 }
		expect(scrubSpanAttributes(attributes)).toEqual(attributes)
	})
})

describe("ScrubbingSpanExporter", () => {
	it("hands the inner exporter a scrubbed copy and leaves the original span alone", () => {
		const { exporter, received } = recordingExporter()
		const span = spanWith({
			"http.request.header.authorization": ["Bearer x"],
			"http.route": "/todos",
		})
		const done = jest.fn()

		new ScrubbingSpanExporter(exporter).export([span], done)

		const [exported] = received[0] ?? []
		expect(exported?.attributes).toEqual({ "http.route": "/todos" })
		expect(exported?.spanContext().spanId).toBe("s".repeat(16))
		expect(Object.keys(span.attributes)).toContain("http.request.header.authorization")
		expect(done).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS })
	})

	it("drops Sentry's entries from the trace state, which carry the request URL", () => {
		// Sentry's sampler records the full request URL, query included, as
		// sentry.url in the W3C trace state; the OTLP exporter ships it with the span.
		const { exporter, received } = recordingExporter()
		// A map-backed trace state, like Sentry's own class (the W3C one rejects
		// dotted keys). sentry.dsc's value contains commas on purpose.
		const traceState = mapTraceState([
			["vendor", "keep"],
			["sentry.sample_rand", "0.5"],
			["sentry.dsc", "sentry-trace_id=abc,sentry-public_key=k"],
			["sentry.url", "https://h/reset-password?token=abc"],
		])
		const span = {
			name: "GET",
			attributes: {},
			spanContext: () => ({
				traceId: "t".repeat(32),
				spanId: "s".repeat(16),
				traceFlags: 1,
				traceState,
			}),
		} as unknown as ReadableSpan

		new ScrubbingSpanExporter(exporter).export([span], jest.fn())

		const [exported] = received[0] ?? []
		expect(exported?.spanContext().traceState?.serialize()).toBe("vendor=keep")
		expect(span.spanContext().traceState?.serialize()).toContain("sentry.url")
	})

	it("scrubs span events, where recordException puts the error message and stack", () => {
		const { exporter, received } = recordingExporter()
		const attributes = {
			"exception.type": "Error",
			"exception.message": "fetch https://h/reset-password?token=abc&lang=en failed",
			"exception.stacktrace": "Error: GET /verify-email?token=xyz\n    at f (file.ts:1:1)",
			"app.user.email": "a@b.c",
		}
		const span = {
			...spanWith({}),
			events: [{ name: "exception", time: [0, 0], attributes }],
		} as unknown as ReadableSpan

		new ScrubbingSpanExporter(exporter).export([span], jest.fn())

		const [exported] = received[0] ?? []
		expect(exported?.events[0]?.attributes).toEqual({
			"exception.type": "Error",
			"exception.message": "fetch https://h/reset-password?token=[REDACTED]&lang=en failed",
			"exception.stacktrace": "Error: GET /verify-email?token=[REDACTED]\n    at f (file.ts:1:1)",
		})
		expect(span.events[0]?.attributes).toBe(attributes)
	})

	it("redacts the reset token Better Auth puts in the path, in the span name and path attributes", () => {
		const { exporter, received } = recordingExporter()
		const span = {
			...spanWith({
				"url.path": "/api/v1/auth/reset-password/live-reset-token",
				"http.target": "/api/v1/auth/reset-password/live-reset-token?callbackURL=/x",
			}),
			name: "GET /api/v1/auth/reset-password/live-reset-token",
		} as unknown as ReadableSpan

		new ScrubbingSpanExporter(exporter).export([span], jest.fn())

		const [exported] = received[0] ?? []
		expect(exported?.name).toBe("GET /api/v1/auth/reset-password/[REDACTED]")
		expect(JSON.stringify(exported?.attributes)).not.toContain("live-reset-token")
	})

	it("scrubs link attributes", () => {
		const { exporter, received } = recordingExporter()
		const link = {
			context: { traceId: "t".repeat(32), spanId: "l".repeat(16), traceFlags: 1 },
			attributes: { "http.request.header.cookie": ["sess=x"], "kept": 1 },
		}
		const span = { ...spanWith({}), links: [link] } as unknown as ReadableSpan

		new ScrubbingSpanExporter(exporter).export([span], jest.fn())

		const [exported] = received[0] ?? []
		expect(exported?.links[0]?.attributes).toEqual({ kept: 1 })
	})

	it("delegates shutdown and forceFlush", async () => {
		const { exporter } = recordingExporter()
		const scrubbing = new ScrubbingSpanExporter(exporter)

		await scrubbing.shutdown()
		await scrubbing.forceFlush()

		expect(exporter.shutdown).toHaveBeenCalled()
		expect(exporter.forceFlush).toHaveBeenCalled()
	})
})
