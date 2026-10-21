/**
 * Sentry initialisation for the backend process.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE READS `process.env` DIRECTLY (documented exemption)
 * ---------------------------------------------------------------------------
 * Every other module reads configuration through `@/config/env.config`, which
 * validates the whole environment at import time and throws on anything
 * malformed. That is the right default — and exactly why it cannot be used
 * here.
 *
 * Sentry's Node SDK has to `init()` BEFORE the instrumented libraries are
 * loaded, so this module is imported at the very top of `main.ts`, ahead of
 * `AppModule` and everything it drags in. Importing `env.config.ts` from here
 * would move full fail-fast env validation onto the error-reporting critical
 * path: a single unrelated misconfigured variable would throw before Sentry
 * exists, i.e. the process would lose its crash reporter precisely in the
 * situation the reporter was installed to observe.
 *
 * So this file reads the four Sentry variables straight off `process.env` and
 * degrades to a no-op on anything it does not like. The same variables are ALSO
 * declared (typed, defaulted, validated) in `@/config/env.config` for the rest
 * of the app — see the matching note there. The duplication is deliberate and
 * bounded to these keys.
 */
import * as Sentry from "@sentry/nestjs"

import {
	REDACTED_FIELD_NAMES,
	REDACTED_QUERY_PARAMS,
	REDACTED_VALUE,
	sanitizeLogQuery,
	sanitizeLogUrl,
} from "@repo/observability"

import {
	omitUnloggedRequestHeaderAttributes,
	omitUnloggedRequestHeaders,
} from "@/utils/unlogged-request-headers"

/** Shape returned by the development-only diagnostics endpoint (Flow 4). */
export interface SentryDiagnostics {
	/** True only when the flag is on, the DSN is present, and it parsed. */
	enabled: boolean
	/** `SENTRY_ENVIRONMENT`, falling back to `NODE_ENV`. */
	environment: string
	/** `IMAGE_TAG`, reported to Sentry as the release. Undefined outside CI builds. */
	release?: string
	/** Whether the configured DSN parsed as a Sentry DSN. Never echoes the DSN itself. */
	dsnParsed: boolean
	/** Populated only when initialisation was skipped for a reason worth surfacing. */
	warning?: string
}

/**
 * The one request path excluded from tracing.
 *
 * Load balancers poll it continuously, so it would dominate the trace quota
 * while carrying no diagnostic value.
 */
const HEALTH_CHECK_PATH = "/api/v1/health"

const deniedFieldNames = new Set<string>(REDACTED_FIELD_NAMES.map(name => name.toLowerCase()))
const deniedQueryParams = new Set<string>(REDACTED_QUERY_PARAMS.map(name => name.toLowerCase()))

/**
 * Remove every deny-listed key from a plain object.
 *
 * Keys are DELETED rather than masked, mirroring the pino logger's
 * `redact: { remove: true }`: the two paths must not disagree about whether a
 * credential leaves the process.
 *
 * `nested` walks exactly one level down, matching the `req.body.*` half of
 * `PINO_REDACT_PATHS` — Better Auth and the oRPC handlers both wrap payloads in
 * a single envelope object.
 */
function stripDeniedKeys<T>(value: T, nested: boolean): T {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return value
	}

	const result: Record<string, unknown> = {}

	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		if (deniedFieldNames.has(key.trim().toLowerCase())) {
			continue
		}
		result[key] = nested ? stripDeniedKeys(entry, false) : entry
	}

	return result as T
}

/**
 * Redact credential-bearing parameters from a query, in any of the shapes the
 * SDK produces.
 *
 * The SDK models `request.query_string` (and the query a breadcrumb records) as
 * a raw string, an object, or an array of pairs depending on how the request was
 * captured, so all three shapes are handled here rather than trusting one. Each
 * shape delegates to the canonical `@repo/observability` helper for its form —
 * `sanitizeLogUrl` for the string, `sanitizeLogQuery` for the parsed object — so
 * the Sentry path cannot redact a different set of parameters than the logger.
 */
function stripDeniedQuery(queryString: unknown): unknown {
	if (!queryString) {
		return queryString
	}

	if (typeof queryString === "string") {
		// `sanitizeLogUrl` needs a `?` to find the query; add one and drop it again.
		const sanitized = sanitizeLogUrl(`?${queryString}`)
		return sanitized ? sanitized.slice(1) : queryString
	}

	if (Array.isArray(queryString)) {
		return queryString.map(pair => {
			if (!Array.isArray(pair) || pair.length === 0) {
				return pair
			}
			const [name, value] = pair as [unknown, unknown]
			return typeof name === "string" && deniedQueryParams.has(name.trim().toLowerCase())
				? [name, REDACTED_VALUE]
				: [name, value]
		})
	}

	if (typeof queryString === "object") {
		return sanitizeLogQuery(queryString as Record<string, unknown>)
	}

	return queryString
}

/**
 * Remove the inbound request id from a Sentry request, plus the credential
 * deny-list this sink already shares with the logger.
 *
 * `x-request-id` is not a credential (it stays off the shared observability
 * list). It is dropped because the only id that may be stored is the one this
 * server assigned, which is sent as the `request_id` tag rather than as a header.
 */
function scrubSentryRequest<T extends Sentry.Event>(event: T): T {
	const request = event.request
	if (!request) {
		return event
	}

	const scrubbed: Record<string, unknown> = {
		...request,
		url: sanitizeLogUrl(request.url),
	}

	if (request.headers) {
		scrubbed.headers = omitUnloggedRequestHeaders(stripDeniedKeys(request.headers, false))
	}

	// The `cookie` header is on the deny-list, so its parsed twin must go too —
	// otherwise the exact value just removed comes back in a tidier shape.
	delete scrubbed.cookies

	if (request.query_string !== undefined) {
		scrubbed.query_string = stripDeniedQuery(request.query_string)
	}

	if (request.data !== undefined) {
		scrubbed.data = stripDeniedKeys(request.data, true)
	}

	return { ...event, request: scrubbed as typeof request }
}

/**
 * The same header also rides on span attributes as `http.request.header.x_request_id`.
 * `sendDefaultPii: false` does not remove it: that deny-list is PII snippets plus
 * sensitive key snippets, and this name matches neither. Response-header
 * attributes are kept — that value is the id the server echoed.
 */
function stripUnloggedHeaderAttributes<T extends Sentry.Event>(event: T): T {
	const trace = event.contexts?.trace
	const traceData = trace && typeof trace.data === "object" && trace.data ? trace.data : undefined
	let next = event

	if (traceData) {
		const data = omitUnloggedRequestHeaderAttributes(traceData)
		if (data !== traceData) {
			next = {
				...next,
				contexts: {
					...next.contexts,
					trace: { ...trace, data },
				},
			}
		}
	}

	if (next.spans) {
		let changed = false
		const spans = next.spans.map(span => {
			const data = omitUnloggedRequestHeaderAttributes(span.data)
			if (data === span.data) {
				return span
			}
			changed = true
			return { ...span, data }
		})
		if (changed) {
			next = { ...next, spans }
		}
	}

	return next
}

/**
 * Scrub an outbound event.
 *
 * Exported so the scrubbing contract is unit-testable without initialising the
 * SDK: this is the last point at which a credential or an unvalidated request
 * id can be kept inside the process, so it is asserted directly rather than
 * inferred.
 */
export function scrubSentryEvent<T extends Sentry.Event>(event: T): T {
	return stripUnloggedHeaderAttributes(scrubSentryRequest(event))
}

/** `beforeSendSpan` sees the span on its own, before it is folded into a transaction. */
export function scrubSentrySpan<T extends { data: object }>(span: T): T {
	const data = omitUnloggedRequestHeaderAttributes(span.data)
	if (data === span.data) {
		return span
	}
	return { ...span, data }
}

/**
 * Keys under which a breadcrumb can carry a query that was already parsed out
 * of the URL.
 *
 * The deny-list of structured field names does not cover these: `state`, `code`
 * and the OAuth token parameters are credentials *as query parameters*, so they
 * only appear in `REDACTED_QUERY_PARAMS`. A breadcrumb that records the query as
 * an object instead of leaving it in the URL string would otherwise export them
 * verbatim — the one shape `sanitizeLogUrl` cannot see.
 */
const BREADCRUMB_QUERY_KEYS = ["query", "query_string", "http.query", "params"] as const

/**
 * Scrub a breadcrumb: same deny-list, plus the URL and any parsed query these
 * usually carry.
 */
export function scrubSentryBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
	if (!breadcrumb.data) {
		return breadcrumb
	}

	const data = stripDeniedKeys(breadcrumb.data, true)

	if (typeof data.url === "string") {
		data.url = sanitizeLogUrl(data.url)
	}

	for (const key of BREADCRUMB_QUERY_KEYS) {
		if (data[key] !== undefined) {
			data[key] = stripDeniedQuery(data[key])
		}
	}

	return { ...breadcrumb, data }
}

/**
 * Whether a span describes the health check.
 *
 * Several attribute names carry the path depending on the instrumentation that
 * produced the span, so every plausible carrier is checked — missing one just
 * means paying for a span nobody reads.
 */
export function isHealthCheckSpan(name: string, attributes?: Record<string, unknown>): boolean {
	const candidates: unknown[] = [
		name,
		attributes?.["http.route"],
		attributes?.["url.path"],
		attributes?.["http.target"],
	]

	return candidates.some(value => typeof value === "string" && value.includes(HEALTH_CHECK_PATH))
}

/**
 * Basic structural check on a DSN.
 *
 * Not a Sentry-side validation — it only catches the mistakes that would
 * otherwise fail silently at send time (a placeholder left in `.env`, a
 * truncated paste), so the process can say so once at boot instead.
 */
function isParseableDsn(dsn: string): boolean {
	try {
		const url = new URL(dsn)

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return false
		}
		// The public key travels as the userinfo component.
		if (!url.username) {
			return false
		}
		// ...and the project id as the last path segment.
		return url.pathname.split("/").filter(Boolean).length > 0
	} catch {
		return false
	}
}

function parseSampleRate(raw: string | undefined): number {
	const parsed = Number.parseFloat(raw ?? "0")

	if (!Number.isFinite(parsed)) {
		return 0
	}

	return Math.min(1, Math.max(0, parsed))
}

function initializeSentry(): SentryDiagnostics {
	const dsn = process.env.SENTRY_DSN?.trim()
	const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development"
	const release = process.env.IMAGE_TAG
	const flagEnabled = process.env.SENTRY_ENABLED === "true"

	// A DSN with no flag is a value parked in the environment for later, not
	// consent to start shipping events — and not worth a log line either.
	if (!flagEnabled) {
		return { enabled: false, environment, release, dsnParsed: false }
	}

	// The flag is on, so events were meant to be shipped somewhere. A missing DSN
	// is an unfinished deployment, i.e. a misconfiguration the operator has to be
	// told about — same treatment as a malformed one below.
	if (!dsn) {
		const warning =
			"SENTRY_ENABLED=true but SENTRY_DSN is missing or empty. " +
			"Sentry is DISABLED for this process. " +
			"Set SENTRY_DSN (Sentry > Project Settings > Client Keys), or unset SENTRY_ENABLED."
		console.warn(`[sentry] ${warning}`)
		return { enabled: false, environment, release, dsnParsed: false, warning }
	}

	if (!isParseableDsn(dsn)) {
		const warning =
			"SENTRY_ENABLED=true but SENTRY_DSN is not a valid Sentry DSN " +
			"(expected https://<publicKey>@<host>/<projectId>). Sentry is DISABLED for this process. " +
			"Copy the DSN from Sentry > Project Settings > Client Keys, or unset SENTRY_ENABLED."
		// Warn, never throw: a mistyped observability credential must not be
		// able to stop the service it was meant to observe.
		console.warn(`[sentry] ${warning}`)
		return { enabled: false, environment, release, dsnParsed: false, warning }
	}

	const tracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE)

	Sentry.init({
		dsn,
		environment,
		release,
		tracesSampleRate,
		// Never attach IPs, cookies or headers on the SDK's own initiative. What
		// reaches Sentry is only what the hooks below have already scrubbed.
		sendDefaultPii: false,
		// Drop the health check before a span is even created — cheaper than
		// sampling it in and discarding it in `beforeSendTransaction`.
		tracesSampler: samplingContext =>
			isHealthCheckSpan(samplingContext.name, samplingContext.attributes)
				? 0
				: samplingContext.inheritOrSampleWith(tracesSampleRate),
		beforeSend: event => scrubSentryEvent(event),
		// Transaction events do carry `request.headers`. `@sentry/node` installs
		// `requestDataIntegration` by default. Its `processEvent` is a client event
		// processor, and `prepareEvent` runs those processors for every event,
		// including `type: "transaction"`. The processor copies
		// `sdkProcessingMetadata.normalizedRequest` — set on the request isolation
		// scope by the HTTP server integration (`http.server.request.start`) — onto
		// `event.request`, headers included. With `sendDefaultPii: false`,
		// `httpHeaders.request` is `{ deny: PII snippets }`, which is not `false`,
		// so the headers are copied in full; the deny-list filters span attributes,
		// not `event.request.headers`. `beforeSend` is not called for transactions
		// (`processBeforeSend` uses it only when `event.type` is undefined), so the
		// same scrub runs here. A captured transaction confirmed both
		// `request.headers["x-request-id"]` and
		// `contexts.trace.data["http.request.header.x_request_id"]` held the inbound
		// value, and `request.headers.authorization` was still the raw header.
		beforeSendTransaction: event => scrubSentryEvent(event),
		beforeSendSpan: span => scrubSentrySpan(span),
		beforeBreadcrumb: breadcrumb => scrubSentryBreadcrumb(breadcrumb),
	})

	// Development convenience: one line confirming monitoring is actually on,
	// carrying the environment and release every event will be tagged with, and
	// pointing at the endpoint that answers the same question later.
	//
	// Gated on a successful init as well as on development: with Sentry disabled
	// the process must boot exactly as it did before this file existed, and a
	// malformed DSN must produce the single actionable warning above and nothing
	// else. `PORT` is not validated yet at this point in the boot, so it is read
	// raw with the same default `env.config.ts` applies — this is a log line, not
	// configuration.
	if (process.env.NODE_ENV === "development") {
		const port = process.env.PORT ?? "3000"
		console.log(
			`[sentry] enabled (environment=${environment}, release=${release ?? "none"}) ` +
				`diagnostics: http://localhost:${port}/api/v1/diagnostics/sentry`
		)
	}

	return { enabled: true, environment, release, dsnParsed: true }
}

const diagnostics: SentryDiagnostics = initializeSentry()

/**
 * Current Sentry state, for the development diagnostics endpoint and any
 * startup logging. Never exposes the DSN — only whether it parsed.
 */
export function getSentryDiagnostics(): SentryDiagnostics {
	return { ...diagnostics }
}
