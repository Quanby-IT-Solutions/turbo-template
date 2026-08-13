/**
 * Shared Sentry wiring for every runtime the web app can initialize the SDK in
 * (browser, Node server, edge).
 *
 * Two things live here because all three init paths need them identically, and
 * a second copy is exactly how one runtime quietly stops scrubbing a field:
 *
 * 1. The enablement gate — flag, DSN shape and environment resolution — so no
 *    two runtimes (and no runtime and the diagnostics page) can disagree about
 *    whether reporting is on or what it is tagged with.
 * 2. The `beforeSend` / `beforeBreadcrumb` scrubbers, built on the canonical
 *    deny-list in `@repo/observability` — the same list the backend's pino
 *    redaction and the Flutter client derive from, so adding a field there
 *    scrubs it here with no second edit.
 */

import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs"

import {
	REDACTED_FIELD_NAMES,
	REDACTED_QUERY_PARAMS,
	REDACTED_VALUE,
	sanitizeLogQuery,
	sanitizeLogUrl,
} from "@repo/observability"

import { env } from "@/env"

/**
 * Structural check on a DSN: `https://<publicKey>@<host>/<projectId>`.
 *
 * Not a Sentry-side validation — it only catches the mistakes that would
 * otherwise fail silently at send time (a placeholder left in `.env`, a
 * truncated paste). `Sentry.init` accepts a malformed DSN, logs nothing by
 * default and then drops every event, a failure mode indistinguishable from
 * "no errors happened".
 *
 * Mirrors the backend's `isParseableDsn` in `apps/backend/src/instrument.ts`,
 * deliberately: the two processes must agree on what counts as a usable DSN.
 */
export function isParseableSentryDsn(dsn: string | undefined): boolean {
	if (!dsn) {
		return false
	}

	try {
		const url = new URL(dsn)

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return false
		}
		// The public key travels as the userinfo component...
		if (!url.username) {
			return false
		}
		// ...and the project id as the last path segment.
		return url.pathname.split("/").filter(Boolean).length > 0
	} catch {
		return false
	}
}

/**
 * The DSN a runtime should hand to `Sentry.init`, or `undefined` when it must
 * not initialize at all.
 *
 * Enablement is deliberately an AND of flag and DSN. A flag with no DSN is a
 * misconfiguration rather than a request to report somewhere, and a flag with a
 * DSN the SDK cannot parse is worse — the client looks enabled and sends
 * nothing.
 *
 * Both cases warn and return `undefined`. Never throws: a mistyped
 * observability credential must not be able to stop the app it was meant to
 * observe, which is also why the DSNs are plain strings in `env.ts` instead of
 * fail-fast `z.url()` values.
 */
export function resolveSentryDsn(options: {
	dsn: string | undefined
	flagEnabled: boolean | undefined
	flagName: string
	dsnName: string
}): string | undefined {
	const dsn = options.dsn?.trim()

	// Nothing turned on, or a DSN parked in the environment for later. Neither is
	// consent to start shipping events, and neither is worth a log line.
	if (!options.flagEnabled) {
		return undefined
	}

	if (!dsn) {
		// eslint-disable-next-line no-console
		console.warn(
			`[sentry] ${options.flagName}=true but ${options.dsnName} is empty. ` +
				`Sentry is DISABLED for this runtime — nothing is being sent.`
		)
		return undefined
	}

	if (!isParseableSentryDsn(dsn)) {
		// eslint-disable-next-line no-console
		console.warn(
			`[sentry] ${options.dsnName} is not a valid Sentry DSN ` +
				`(expected https://<publicKey>@<host>/<projectId>). Sentry is DISABLED for this runtime. ` +
				`Copy the DSN from Sentry > Project Settings > Client Keys, or unset ${options.flagName}.`
		)
		return undefined
	}

	return dsn
}

/**
 * DSN the browser SDK initializes with, or `undefined` when reporting is off or
 * misconfigured. Resolved once here so the SDK entrypoint, the crash screen and
 * the diagnostics page can never disagree about what the browser is doing.
 */
export const clientSentryDsn = resolveSentryDsn({
	dsn: env.NEXT_PUBLIC_SENTRY_DSN,
	flagEnabled: env.NEXT_PUBLIC_SENTRY_ENABLED,
	flagName: "NEXT_PUBLIC_SENTRY_ENABLED",
	dsnName: "NEXT_PUBLIC_SENTRY_DSN",
})

/** Whether the browser SDK should initialize at all. */
export const isSentryClientEnabled = Boolean(clientSentryDsn)

/**
 * The one environment-resolution rule, shared by all three runtimes: the
 * configured Sentry environment wins, `NODE_ENV` is the fallback.
 *
 * A function rather than a constant because the browser and the server read
 * different variables (`NEXT_PUBLIC_SENTRY_ENVIRONMENT` vs `SENTRY_ENVIRONMENT`)
 * and this module is bundled for the browser, where touching a server-only key
 * throws. `||`, not `??`: a Docker build passes unset build args through as
 * empty strings, and an event tagged with an empty environment is worse than one
 * tagged with the build mode.
 */
export function resolveSentryEnvironment(configured: string | undefined, nodeEnv: string): string {
	return configured?.trim() || nodeEnv
}

/**
 * Environment tag every browser event carries, so a production build deployed
 * to staging does not tag its client events `production` while its server
 * events say `staging`.
 */
export const clientSentryEnvironment = resolveSentryEnvironment(
	env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
	env.NODE_ENV
)

/** Request payload shape Sentry attaches to an event. */
type SentryRequestData = NonNullable<ErrorEvent["request"]>

/** Deny-listed structured field names, lower-cased once for comparison. */
const redactedKeys = new Set<string>(REDACTED_FIELD_NAMES.map(name => name.toLowerCase()))

/** Credential-bearing query parameter names, lower-cased once for comparison. */
const redactedQueryParams = new Set<string>(REDACTED_QUERY_PARAMS.map(name => name.toLowerCase()))

/**
 * Keys whose string value is a URL, and therefore may carry a credential in its
 * query string (`?token=…`). The value is rewritten rather than dropped: the
 * path is the part that makes a breadcrumb worth keeping.
 */
const urlKeys = new Set(["url", "href", "link", "location", "referrer", "to", "from"])

/**
 * Keys under which a breadcrumb can carry a query that was already parsed out
 * of the URL.
 *
 * `REDACTED_FIELD_NAMES` does not cover these: `state`, `code` and the OAuth
 * token parameters are credentials *as query parameters*, so they only appear
 * in `REDACTED_QUERY_PARAMS`. A breadcrumb that records the query as an object
 * or a pair array instead of leaving it in the URL string would otherwise
 * export them verbatim — the one shape `sanitizeLogUrl` cannot see.
 *
 * Mirrors `BREADCRUMB_QUERY_KEYS` in `apps/backend/src/instrument.ts`.
 */
const BREADCRUMB_QUERY_KEYS = ["query", "query_string", "params", "http.query"] as const

/**
 * How far into a nested payload the scrubber walks.
 *
 * A depth bound rather than a visited-set: Sentry payloads are shallow, and a
 * cyclic object would otherwise hang `beforeSend` on the request path — the one
 * place a hang is least affordable.
 */
const MAX_SCRUB_DEPTH = 4

function scrubValue(value: unknown, depth: number): unknown {
	if (depth >= MAX_SCRUB_DEPTH || !value || typeof value !== "object") {
		return value
	}

	if (Array.isArray(value)) {
		return value.map(item => scrubValue(item, depth + 1))
	}

	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).map(([key, item]) => {
			const name = key.trim().toLowerCase()

			if (redactedKeys.has(name)) {
				return [key, REDACTED_VALUE]
			}

			if (typeof item === "string" && urlKeys.has(name)) {
				return [key, sanitizeLogUrl(item)]
			}

			return [key, scrubValue(item, depth + 1)]
		})
	)
}

/**
 * Scrub the credential-bearing parameters out of a query in any of the three
 * shapes it reaches here in: the raw string, Sentry's `[name, value]` tuple
 * form, and the parsed object a breadcrumb carries.
 *
 * `unknown` rather than `SentryRequestData["query_string"]` because breadcrumb
 * data is untyped — the same scrubber has to cope with whatever an instrumented
 * fetch or navigation put under `query`/`params`.
 */
function scrubQueryString(query: unknown): unknown {
	if (typeof query === "string") {
		// `sanitizeLogUrl` only recognises a query string when it is introduced by
		// `?`; the marker is not part of the value Sentry stores, so it comes back
		// off afterwards.
		return sanitizeLogUrl(`?${query}`)?.slice(1)
	}

	// `sanitizeLogQuery` deliberately passes arrays through untouched (a log
	// query object is never an array), but Sentry's tuple form is exactly that,
	// so it is handled here instead of being left unscrubbed.
	if (Array.isArray(query)) {
		return (query as unknown[]).map(entry => {
			// Anything that is not a `[name, …]` pair is left alone rather than
			// guessed at: a scrubber that throws inside `beforeBreadcrumb` would
			// take the report down with it.
			if (!Array.isArray(entry) || typeof entry[0] !== "string") {
				return entry
			}

			const name = entry[0]

			return redactedQueryParams.has(name.trim().toLowerCase()) ? [name, REDACTED_VALUE] : entry
		})
	}

	return sanitizeLogQuery(query)
}

function scrubRequest(request: SentryRequestData): SentryRequestData {
	return {
		...request,
		url: sanitizeLogUrl(request.url),
		query_string: scrubQueryString(request.query_string) as SentryRequestData["query_string"],
		// The parsed twin of the `cookie` header — same session token under a
		// different field, so scrubbing the header alone would not cover it.
		cookies: undefined,
		headers: request.headers
			? (scrubValue(request.headers, 0) as SentryRequestData["headers"])
			: undefined,
		data: scrubValue(request.data, 0),
	}
}

/**
 * `beforeSend` hook: strip every deny-listed field from an outgoing event.
 *
 * Covers the four places application data reaches an event — `extra`,
 * `contexts`, `request` (URL, query, headers, body) and the breadcrumb trail —
 * and returns the event rather than dropping it, so a scrubbed report is still
 * a report.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
	if (event.extra) {
		event.extra = scrubValue(event.extra, 0) as ErrorEvent["extra"]
	}

	if (event.contexts) {
		event.contexts = scrubValue(event.contexts, 0) as ErrorEvent["contexts"]
	}

	if (event.request) {
		event.request = scrubRequest(event.request)
	}

	if (event.breadcrumbs) {
		event.breadcrumbs = event.breadcrumbs.map(breadcrumb => scrubSentryBreadcrumb(breadcrumb))
	}

	return event
}

/**
 * `beforeBreadcrumb` hook: scrub a breadcrumb as it is recorded.
 *
 * Breadcrumbs are captured continuously and only attached when something goes
 * wrong, so scrubbing them here means a credential never sits in the in-memory
 * trail at all — not merely that it is removed on the way out.
 */
export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
	if (!breadcrumb.data) {
		return breadcrumb
	}

	const data = scrubValue(breadcrumb.data, 0) as Record<string, unknown>

	// The deny-list pass above knows field names, not query-parameter names, so a
	// query the instrumentation already parsed out of the URL still holds its
	// `state`/`code`/`access_token` values. Scrub those carriers explicitly.
	for (const key of BREADCRUMB_QUERY_KEYS) {
		if (data[key] !== undefined) {
			data[key] = scrubQueryString(data[key])
		}
	}

	return { ...breadcrumb, data }
}
