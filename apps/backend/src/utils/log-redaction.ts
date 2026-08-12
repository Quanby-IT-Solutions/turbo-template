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
