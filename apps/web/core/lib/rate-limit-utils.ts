import { ApiError } from "@/core/lib/api-error"

// Parsed rate-limit outcome. `retryAfter` is seconds until retry is allowed, or
// `null` when the server did not advertise a Retry-After value.
export type RateLimitInfo = {
	isRateLimit: boolean
	retryAfter: number | null
	message: string
}

/**
 * Thrown by auth hooks when the backend responds with 429. Carries the parsed
 * retry-after seconds (or `null` when unknown) so form components can drive a
 * countdown without re-parsing the underlying Better Auth error shape.
 */
export class RateLimitError extends Error {
	readonly retryAfter: number | null
	readonly isRateLimit = true

	constructor(retryAfter: number | null, message = "Too many attempts.") {
		super(message)
		this.name = "RateLimitError"
		this.retryAfter = retryAfter
	}
}

function formatMessage(retryAfter: number | null): string {
	return retryAfter && retryAfter > 0
		? `Too many attempts. Please try again in ${retryAfter} seconds.`
		: "Too many attempts. Please try again shortly."
}

function notRateLimit(): RateLimitInfo {
	return { isRateLimit: false, retryAfter: null, message: "" }
}

// Extracts a positive integer of seconds from a free-form message such as
// "try again in 30 seconds". Returns null when no number is present.
function parseSecondsFromMessage(message: string | undefined): number | null {
	if (!message) return null
	const match = message.match(/(\d+)/)
	if (!match?.[1]) return null
	const value = Number.parseInt(match[1], 10)
	return Number.isNaN(value) ? null : value
}

function readRetryAfterHeader(headers: unknown): number | null {
	const get = (headers as { get?: (name: string) => string | null } | null | undefined)?.get
	if (typeof get !== "function") return null
	const raw = get.call(headers, "retry-after") ?? get.call(headers, "x-retry-after") ?? null
	if (!raw) return null
	const value = Number.parseInt(raw, 10)
	return Number.isNaN(value) ? null : value
}

/**
 * Extracts retry-after seconds from a Better Auth error object, preferring the
 * `Retry-After`/`X-Retry-After` response headers and falling back to a number
 * parsed from the message. Returns null when nothing usable is present.
 *
 * Auth calls should pass a value from `createRetryAfterCapture().seconds()`
 * instead of calling this directly: the client error object does not carry
 * response headers.
 */
export function extractRetryAfterSeconds(error: {
	message?: string
	headers?: unknown
}): number | null {
	return readRetryAfterHeader(error.headers) ?? parseSecondsFromMessage(error.message)
}

// `onError` context from better-fetch. Only `response` is read. `request`,
// `error` and `responseText` are accepted so callers can pass the real context
// through without a cast; they are not used.
type RetryAfterErrorContext = {
	response?: {
		status?: number
		headers?: unknown
	} | null
	responseText?: string
	request?: unknown
	error?: unknown
}

export type RetryAfterCapture = {
	fetchOptions: {
		onError: (ctx: RetryAfterErrorContext) => void
	}
	seconds: (error?: { message?: string; headers?: unknown } | null) => number | null
}

/**
 * Per-request capture of the rate-limit wait from one auth call.
 *
 * The client library builds its returned error as the JSON body plus `status`
 * and `statusText`, and does not attach response headers. The `Response` is
 * only available to `fetchOptions.onError`. Create one capture inside each
 * request, pass `fetchOptions` with that call, then use `seconds(error)`.
 *
 * Precedence: captured `Retry-After` / `X-Retry-After` on a 429, then
 * `error.headers`, then a number in the message. A non-429 response captures
 * nothing. Separate calls do not share state.
 */
export function createRetryAfterCapture(): RetryAfterCapture {
	let captured: number | null = null

	return {
		fetchOptions: {
			onError(ctx) {
				if (ctx.response?.status !== 429) return
				captured = readRetryAfterHeader(ctx.response.headers)
			},
		},
		seconds(error) {
			return captured ?? extractRetryAfterSeconds(error ?? {})
		},
	}
}

/**
 * Framework-agnostic classifier for rate-limit (429) errors across the two
 * error shapes used in this app: `ApiError` (custom fetch) and the Better Auth
 * `{ status, message, headers? }` error object. Also detects `RateLimitError`.
 */
export function parseRateLimitError(error: unknown): RateLimitInfo {
	if (error instanceof RateLimitError) {
		return {
			isRateLimit: true,
			retryAfter: error.retryAfter,
			message: formatMessage(error.retryAfter),
		}
	}

	if (error instanceof ApiError) {
		if (error.status !== 429) return notRateLimit()
		const retryAfter = error.retryAfter ?? null
		return { isRateLimit: true, retryAfter, message: formatMessage(retryAfter) }
	}

	if (typeof error === "object" && error !== null) {
		const candidate = error as {
			status?: number
			message?: string
			headers?: unknown
		}
		if (candidate.status === 429) {
			const retryAfter =
				readRetryAfterHeader(candidate.headers) ?? parseSecondsFromMessage(candidate.message)
			return { isRateLimit: true, retryAfter, message: formatMessage(retryAfter) }
		}
	}

	return notRateLimit()
}
