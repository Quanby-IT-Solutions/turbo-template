import { REDACTED_FIELD_NAMES, sanitizeLogUrl } from "./redaction.js"

const deniedKeys = new Set<string>(REDACTED_FIELD_NAMES.map(name => name.toLowerCase()))

/**
 * How deep nested values are walked. Same bound as the web app's Sentry scrub:
 * deep enough for any property shape the app builds, shallow enough that a
 * cyclic or pathological value cannot stall an event on its way out.
 */
const MAX_SCRUB_DEPTH = 4

function isDenied(key: string): boolean {
	return deniedKeys.has(key.trim().toLowerCase())
}

/**
 * Keys whose string value is a URL: PostHog's `$current_url`, `$referrer`,
 * `$pathname`, their `$initial_*` person twins, and any app property named
 * like one. Their credential query parameters (`?token=` on the verify-email
 * and reset-password pages) are redacted the same way the request logger does.
 */
const URL_KEY = /url|referr?er|href|pathname|location/i

function scrubValue(value: unknown, depth: number, key?: string): unknown {
	if (typeof value === "string" && key && URL_KEY.test(key)) return sanitizeLogUrl(value)
	if (depth >= MAX_SCRUB_DEPTH || value === null || typeof value !== "object") return value
	if (Array.isArray(value)) return value.map(item => scrubValue(item, depth + 1))

	const result: Record<string, unknown> = {}
	for (const [key, inner] of Object.entries(value)) {
		if (isDenied(key)) continue
		result[key] = scrubValue(inner, depth + 1, key)
	}
	return result
}

/**
 * Drops every deny-listed key from an analytics event's properties.
 *
 * The list is `REDACTED_FIELD_NAMES`, the one the logger and Sentry use, so
 * "what the logs strip" and "what analytics strips" cannot drift apart; URL
 * properties lose their credential query parameters too. Any
 * object or array is walked, whatever its declared type: the mobile twin once
 * checked only one map type and let a nested password through. Returns a
 * copy; the input is never mutated.
 */
export function scrubEventProperties(properties: Record<string, unknown>): Record<string, unknown> {
	return scrubValue(properties, 0) as Record<string, unknown>
}
