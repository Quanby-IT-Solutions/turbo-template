/**
 * Request-id sanitisation for the log path.
 *
 * The redaction policy itself — query-string and structured-field stripping —
 * lives in `@repo/observability`, which is shared with non-backend clients.
 * What stays here is the correlation-id handling, a transport concern of this
 * HTTP server alone.
 */

/**
 * Longest correlation id accepted from a client.
 *
 * An inbound `X-Request-Id` was taken verbatim: unbounded, logged, and echoed
 * back on the response. Request ids must be validated (format and length)
 * before they are logged or echoed.
 */
export const MAX_REQUEST_ID_LENGTH = 64

/**
 * Safe charset: what a UUID, ULID or similar correlation id is made of.
 * Deliberately an allowlist — no whitespace, no control characters, nothing
 * that could terminate a header or a log field.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/

/**
 * The inbound id if it is safe to reuse, otherwise null so the caller mints a
 * fresh one. Reusing a client value is what makes distributed tracing work, so
 * it is kept — but only when it is safe to put in a log line.
 */
export function sanitizeRequestId(value: unknown): string | null {
	const raw = Array.isArray(value) ? value[0] : value
	if (typeof raw !== "string") return null
	if (raw.length === 0 || raw.length > MAX_REQUEST_ID_LENGTH) return null
	if (!REQUEST_ID_PATTERN.test(raw)) return null
	return raw
}
