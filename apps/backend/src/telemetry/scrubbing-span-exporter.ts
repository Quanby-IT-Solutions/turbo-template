import type { Attributes, TraceState } from "@opentelemetry/api"
import type { ExportResult } from "@opentelemetry/core"
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base"

import { REDACTED_FIELD_NAMES, sanitizeLogUrl } from "@repo/observability"

import { omitUnloggedRequestHeaderAttributes } from "@/utils/unlogged-request-headers"

const deniedFieldNames = new Set<string>(REDACTED_FIELD_NAMES.map(name => name.toLowerCase()))

/** Attributes whose value is a URL or a path with a query string. */
const URL_ATTRIBUTES = ["url.full", "http.url", "http.target"] as const

function isDeniedAttribute(key: string): boolean {
	const lower = key.toLowerCase()
	const lastSegment = lower.slice(lower.lastIndexOf(".") + 1).replace(/_/g, "-")
	return deniedFieldNames.has(lastSegment) || deniedFieldNames.has(lastSegment.replace(/-/g, ""))
}

/**
 * A span's attributes as they may leave the process over OTLP.
 *
 * The same rules Sentry's `beforeSendSpan` applies, from the same shared lists:
 * request-header attributes the logger never records (`x-request-id`) are
 * dropped; any attribute named after a deny-listed field (`...authorization`,
 * `...cookie`, `...password`, `...email`) is dropped; credential query
 * parameters (`?token=`) in URL attributes are redacted. Returns a copy.
 */
export function scrubSpanAttributes(attributes: Attributes): Attributes {
	const result: Attributes = {}
	for (const [key, value] of Object.entries(omitUnloggedRequestHeaderAttributes(attributes))) {
		if (isDeniedAttribute(key)) continue
		result[key] = value
	}

	for (const key of URL_ATTRIBUTES) {
		const value = result[key]
		if (typeof value === "string") result[key] = sanitizeLogUrl(value)
	}
	const query = result["url.query"]
	if (typeof query === "string") {
		// `sanitizeLogUrl` finds the query after a `?`; add one and drop it again.
		result["url.query"] = sanitizeLogUrl(`?${query}`)?.slice(1) ?? query
	}

	return result
}

/** Event attributes that hold free text which can quote a request URL. */
const TEXT_ATTRIBUTES = ["exception.message", "exception.stacktrace"] as const

/** Every URL or path with a query string inside free text. */
const URL_WITH_QUERY = /[^\s"'<>]*\?[^\s"'<>]+/g

/**
 * An event's attributes as they may leave the process. `recordException`
 * stores the error message and stack here, and either can quote a request URL
 * (`?token=`), so their query strings are redacted in place.
 */
function scrubEventAttributes(attributes: Attributes | undefined): Attributes | undefined {
	if (!attributes) return attributes
	const result = scrubSpanAttributes(attributes)
	for (const key of TEXT_ATTRIBUTES) {
		const value = result[key]
		if (typeof value === "string") {
			result[key] = value.replace(URL_WITH_QUERY, match => sanitizeLogUrl(match) ?? match)
		}
	}
	return result
}

/**
 * Wraps the OTLP span exporter so every exported span is scrubbed first.
 *
 * Only the OTLP path goes through here. Sentry's own path keeps its existing
 * `beforeSendSpan`, so each destination is scrubbed by the same rules once.
 */
export class ScrubbingSpanExporter implements SpanExporter {
	constructor(private readonly inner: SpanExporter) {}

	export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
		this.inner.export(spans.map(scrubbedCopy), resultCallback)
	}

	shutdown(): Promise<void> {
		return this.inner.shutdown()
	}

	forceFlush(): Promise<void> {
		return this.inner.forceFlush?.() ?? Promise.resolve()
	}
}

/** A key Sentry writes into the W3C trace state for its own sampling. */
const SENTRY_TRACE_STATE_KEY = /(?:^|,)(sentry\.[a-z_]+)=/g

/**
 * The trace state without Sentry's entries.
 *
 * Sentry's sampler records the full request URL, query string included, as
 * `sentry.url`, plus sampling bookkeeping (`sentry.dsc`, `sentry.sample_rand`
 * and others). They mean nothing to an OTLP backend and `sentry.url` can carry
 * a `?token=`, so none of them is exported. Other vendors' entries stay.
 */
export function withoutSentryEntries(traceState: TraceState | undefined): TraceState | undefined {
	if (!traceState) return traceState
	let next = traceState
	for (const [, key] of traceState.serialize().matchAll(SENTRY_TRACE_STATE_KEY)) {
		if (key) next = next.unset(key)
	}
	return next
}

/**
 * A copy of the span with scrubbed attributes, events and trace state. The prototype
 * is kept so other methods still work; the original span is not touched.
 */
function scrubbedCopy(span: ReadableSpan): ReadableSpan {
	const context = span.spanContext()
	const scrubbedContext = { ...context, traceState: withoutSentryEntries(context.traceState) }
	const copy = Object.create(Object.getPrototypeOf(span) as object) as ReadableSpan
	return Object.assign(copy, span, {
		attributes: scrubSpanAttributes(span.attributes),
		events: span.events?.map(event => ({
			...event,
			attributes: scrubEventAttributes(event.attributes),
		})),
		spanContext: () => scrubbedContext,
	})
}
