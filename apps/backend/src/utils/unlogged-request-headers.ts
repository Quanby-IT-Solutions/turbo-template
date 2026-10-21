/**
 * Inbound request headers this backend stores nowhere.
 *
 * These are not credentials. The shared deny-list in `@repo/observability` is
 * the credential set the web and mobile parity tests share, and this header is
 * not on it. `x-request-id` is only the caller's suggestion: the id on record
 * is the one this server assigned (`req.id`, echoed on the response). An
 * inbound value that failed that check must not be kept beside it.
 *
 * Node lower-cases incoming header names. Callers still match case-insensitively,
 * because Sentry replays the header map in whatever case it captured.
 */
export const UNLOGGED_REQUEST_HEADERS = ["x-request-id"] as const

const unloggedRequestHeaderNames = new Set<string>(UNLOGGED_REQUEST_HEADERS)

/**
 * Span attribute written by the SDK's request-data integration
 * (`httpHeadersToSpanAttributes`): `http.request.header.` plus the header name
 * with `-` turned into `_`.
 */
const REQUEST_HEADER_ATTRIBUTE_PREFIX = "http.request.header."

export function isUnloggedRequestHeader(name: string): boolean {
	return unloggedRequestHeaderNames.has(name.toLowerCase())
}

/**
 * Copy of `headers` without the unlogged names.
 *
 * Always a new object. pino passes the live request header map into the
 * serializer, so deleting a key — or returning the same object for a later
 * redact pass to mutate — would change the request the rest of the pipeline sees.
 */
export function omitUnloggedRequestHeaders<T extends object>(headers: T): T {
	const next: Record<string, unknown> = {}

	for (const [name, value] of Object.entries(headers)) {
		if (!isUnloggedRequestHeader(name)) {
			next[name] = value
		}
	}

	return next as T
}

export function isUnloggedRequestHeaderAttribute(attribute: string): boolean {
	const lower = attribute.toLowerCase()
	if (!lower.startsWith(REQUEST_HEADER_ATTRIBUTE_PREFIX)) {
		return false
	}

	const headerName = lower.slice(REQUEST_HEADER_ATTRIBUTE_PREFIX.length).replace(/_/g, "-")
	return isUnloggedRequestHeader(headerName)
}

/**
 * Copy of a span-attribute map without the unlogged request-header attributes.
 * The same object is returned when nothing matched, so callers can skip a rewrite.
 * Response-header attributes are left alone: `http.response.header.x_request_id`
 * is the id this server echoed, not the inbound value.
 */
export function omitUnloggedRequestHeaderAttributes<T extends object>(attributes: T): T {
	let dropped = false
	const next: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(attributes)) {
		if (isUnloggedRequestHeaderAttribute(key)) {
			dropped = true
			continue
		}
		next[key] = value
	}

	return (dropped ? next : attributes) as T
}
