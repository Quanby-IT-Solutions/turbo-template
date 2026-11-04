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

	it("delegates shutdown and forceFlush", async () => {
		const { exporter } = recordingExporter()
		const scrubbing = new ScrubbingSpanExporter(exporter)

		await scrubbing.shutdown()
		await scrubbing.forceFlush()

		expect(exporter.shutdown).toHaveBeenCalled()
		expect(exporter.forceFlush).toHaveBeenCalled()
	})
})
