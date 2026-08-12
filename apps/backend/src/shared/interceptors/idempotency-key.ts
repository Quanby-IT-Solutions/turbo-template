/**
 * Validation rules for the `Idempotency-Key` header (AB-3 / F-13).
 *
 * The header was previously taken verbatim: any length, any bytes. That value
 * became a primary key and was fed to `hashtext()` for an advisory lock, so an
 * unbounded header was a cheap way to write unbounded rows.
 *
 * Kept separate from the interceptor so the rule can be asserted directly and
 * reused wherever else a key is accepted.
 */

/**
 * Longest accepted key. A UUID is 36 characters; 128 leaves room for prefixed
 * or composite client schemes without letting a header carry a payload.
 */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128

/** Shortest key worth accepting — below this, collisions are likely. */
export const IDEMPOTENCY_KEY_MIN_LENGTH = 8

/**
 * Printable ASCII without whitespace or control characters. Deliberately an
 * allowlist: a key ends up in log lines and a primary key, and there is no
 * reason for it to contain anything a UUID or a ULID would not.
 */
const KEY_PATTERN = /^[A-Za-z0-9_:.-]+$/

export type IdempotencyKeyProblem = "too-short" | "too-long" | "malformed"

/** Why a key is unacceptable, or null when it is fine. */
export function validateIdempotencyKey(key: string): IdempotencyKeyProblem | null {
	if (key.length < IDEMPOTENCY_KEY_MIN_LENGTH) return "too-short"
	if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) return "too-long"
	if (!KEY_PATTERN.test(key)) return "malformed"
	return null
}

/** Message for a rejected key. Says what is wrong without echoing the value. */
export function describeIdempotencyKeyProblem(problem: IdempotencyKeyProblem): string {
	switch (problem) {
		case "too-short":
			return `Idempotency-Key must be at least ${IDEMPOTENCY_KEY_MIN_LENGTH} characters`
		case "too-long":
			return `Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`
		case "malformed":
			return "Idempotency-Key may contain only letters, digits, and the characters _ : . -"
	}
}

/**
 * How long a stored response stays replayable.
 *
 * 24h is long enough to cover a client retrying after an outage, and short
 * enough that the table stays a cache rather than an unbounded log of every
 * mutation the system has ever served.
 */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000
