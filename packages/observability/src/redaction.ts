/**
 * Redaction helpers for the request log path (LG-1 / F-05).
 *
 * Pino's `redact` option only reaches structured fields. Single-use credentials
 * also travel in the **query string** — Better Auth's verification and
 * password-reset links are `?token=…` URLs — and every request log line carries
 * `req.url` verbatim. Logs shipped to a retention system therefore became a
 * store of live credentials.
 */

/**
 * Query parameters whose values are credentials.
 *
 * This is an allowlist of names to strip, deliberately not a list of paths to
 * exempt: a path-based rule silently stops covering a route the moment someone
 * adds one, whereas a name-based rule keeps working wherever the parameter
 * appears. Matched case-insensitively.
 */
export const REDACTED_QUERY_PARAMS = [
	"token",
	"code",
	"secret",
	"password",
	"access_token",
	"refresh_token",
	"id_token",
	// OAuth CSRF token. `callbackURL` is deliberately absent: it is a redirect
	// path, not a credential, and it is worth keeping for tracing.
	"state",
] as const

/**
 * Where a redacted field travels on the wire, i.e. where a logger can reach it.
 *
 * - `request-header`  → `req.headers.<name>`
 * - `response-header` → `res.headers['<name>']`
 * - `body`            → `req.body.<name>` plus its one-level-nested form
 */
export type RedactedFieldPlacement = "request-header" | "response-header" | "body"

/**
 * The canonical deny-list: every structured field whose value must never reach
 * a log sink, paired with where it travels.
 *
 * This array is the single source of truth for every consumer. `REDACTED_FIELD_NAMES`
 * projects the semantic names out of it (mirrored for non-TypeScript clients by
 * `redaction-manifest.json`, and the deny-list a Sentry `beforeSend` scrubber
 * will scrub by), and `PINO_REDACT_PATHS` expands it into the path syntax pino
 * wants. Neither list is hand-maintained: two hand-maintained lists is exactly
 * how the backend logger and the client scrubbers start emitting different
 * fields, which is the drift this package exists to prevent.
 *
 * Adding a field here scrubs it everywhere at once. The expansion is pinned in
 * `redaction.spec.ts` so a placement mistake fails a test rather than leaking.
 */
const REDACTED_FIELDS = [
	{ name: "authorization", placement: "request-header" },
	{ name: "cookie", placement: "request-header" },
	{ name: "set-cookie", placement: "response-header" },
	{ name: "password", placement: "body" },
	// Single-use credentials from the verification and reset flows.
	{ name: "token", placement: "body" },
	{ name: "newPassword", placement: "body" },
	{ name: "currentPassword", placement: "body" },
	// PII: an address is enough to correlate a person across log lines.
	{ name: "email", placement: "body" },
] as const satisfies readonly { name: string; placement: RedactedFieldPlacement }[]

/** A field name on the canonical deny-list. */
export type RedactedFieldName = (typeof REDACTED_FIELDS)[number]["name"]

/**
 * Structured field names whose values must never reach a log sink.
 *
 * The cross-language source of truth: `redaction-manifest.json` mirrors this
 * list for clients that cannot import TypeScript (the Flutter app). The parity
 * between the two is asserted in `redaction.spec.ts` — two lists that drift
 * silently is exactly how a credential ends up retained.
 */
export const REDACTED_FIELD_NAMES: readonly RedactedFieldName[] = REDACTED_FIELDS.map(
	field => field.name
)

/**
 * Pino `redact.paths` for the request logger.
 *
 * Derived from `REDACTED_FIELDS` rather than written out, so the logger cannot
 * cover a different set of names than the manifest and the client scrubbers.
 * Paired with `remove: true` so no value survives in any sink.
 */
export const PINO_REDACT_PATHS: readonly string[] = REDACTED_FIELDS.flatMap(
	({ name, placement }) => {
		if (placement === "request-header") return [`req.headers${pinoAccessor(name)}`]
		if (placement === "response-header") return [`res.headers${pinoAccessor(name)}`]
		// Bodies are scrubbed at the top level and one level down: Better Auth and
		// the oRPC handlers both wrap payloads in a single envelope object.
		return [`req.body${pinoAccessor(name)}`, `req.body.*${pinoAccessor(name)}`]
	}
)

/**
 * Render one path segment.
 *
 * Pino paths are dotted, but a name that is not a plain identifier
 * (`set-cookie`) has to be bracketed or pino fails to parse the path.
 */
function pinoAccessor(name: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? `.${name}` : `['${name}']`
}

/** Placeholder left in the log so the parameter's presence is still visible. */
export const REDACTED_VALUE = "[REDACTED]"

const redactedParams = new Set<string>(REDACTED_QUERY_PARAMS.map(name => name.toLowerCase()))

/**
 * Replace the value of every credential-bearing query parameter in a URL.
 *
 * Accepts the path-relative form Node hands to request loggers (`/a/b?c=d`) as
 * well as absolute URLs. Anything unparseable is reduced to its path prefix
 * rather than logged as-is — an unrecognised shape is exactly when a token is
 * most likely to slip through.
 */
export function sanitizeLogUrl(url: string | undefined): string | undefined {
	if (!url) return url

	const queryStart = url.indexOf("?")
	if (queryStart === -1) return url

	const path = url.slice(0, queryStart)
	const rawQuery = url.slice(queryStart + 1)

	// Hand-parse rather than using URLSearchParams: it re-encodes the whole
	// query, so untouched parameters would come back subtly rewritten and stop
	// matching what the client actually sent.
	const sanitized = rawQuery
		.split("&")
		.map(pair => {
			if (!pair) return pair

			const separator = pair.indexOf("=")
			if (separator === -1) {
				return redactedParams.has(decodeName(pair)) ? `${pair}=${REDACTED_VALUE}` : pair
			}

			const name = pair.slice(0, separator)
			return redactedParams.has(decodeName(name)) ? `${name}=${REDACTED_VALUE}` : pair
		})
		.join("&")

	return `${path}?${sanitized}`
}

/**
 * Redact credential-bearing entries from a parsed query object.
 *
 * pino-http serializes `req.query` as its own field, so sanitizing `req.url`
 * alone still leaves the token in the log line — parsed out into a tidy object
 * right next to the URL it was stripped from.
 */
export function sanitizeLogQuery<T>(query: T): T {
	if (!query || typeof query !== "object" || Array.isArray(query)) return query

	const entries = Object.entries(query as Record<string, unknown>)
	if (entries.length === 0) return query

	return Object.fromEntries(
		entries.map(([name, value]) => [
			name,
			redactedParams.has(name.trim().toLowerCase()) ? REDACTED_VALUE : value,
		])
	) as T
}

function decodeName(name: string): string {
	try {
		return decodeURIComponent(name).trim().toLowerCase()
	} catch {
		// A malformed escape sequence is not a reason to let the pair through
		// unexamined; compare the raw text instead.
		return name.trim().toLowerCase()
	}
}
