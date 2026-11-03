/**
 * Storage for Better Auth's own rate limiter.
 *
 * Better Auth answers its routes (sign-in, sign-up, password reset,
 * verification) before Nest sees the request, so `@nestjs/throttler` never
 * counts them. Better Auth limits them itself, and by default it keeps those
 * counts in process memory. With more than one backend instance that makes a
 * limit of N per window into N per window per instance, and a restart resets
 * every count.
 *
 * This package does not depend on Redis, so it cannot build the shared store
 * itself. Instead `createAuth()` installs `rateLimitStorage` below, which
 * forwards each call to whatever storage the host process registered with
 * `setAuthRateLimitStorage()`, and to a process-local memory store until then.
 * The binding has to be late: the backend calls `getAuth()` while its root
 * module is still being imported, before its Redis connection exists. The
 * Better Auth CLI and the test suites never register anything and get the
 * memory store.
 *
 * Both stores use a fixed window: the first request opens it, and it closes
 * `window` seconds later. That is the same rule Better Auth applies to its own
 * secondary-storage path, so the count means the same thing with or without
 * Redis.
 */

/**
 * The rate-limit storage contract of better-auth 1.7
 * (`BetterAuthRateLimitStorage` in `@better-auth/core`). Declared here
 * because `better-auth` does not re-export it and `@better-auth/core` is not a
 * direct dependency; `createAuth()` passing this to `customStorage` is where
 * the compiler checks the two still agree.
 *
 * `consume` records one request against `key` and reports whether it is
 * allowed, in one step. `window` is in seconds. When a request is refused,
 * `retryAfter` is the number of seconds until the window frees up.
 */
export interface AuthRateLimitStorage {
	consume(
		key: string,
		rule: { window: number; max: number }
	): Promise<{ allowed: boolean; retryAfter: number | null }>
}

const DEFAULT_MAX_ENTRIES = 100_000

interface WindowEntry {
	count: number
	/** Epoch ms at which the window that opened with the first request closes. */
	expiresAt: number
}

/**
 * Process-local fixed-window store.
 *
 * Expired entries are pruned on every call, and the oldest entries are dropped
 * once `maxEntries` is reached, so a flood of distinct keys cannot grow the map
 * without bound. A `Map` iterates in insertion order, which is what makes
 * "oldest first" a plain walk from the front.
 */
export function createMemoryRateLimitStorage(options?: {
	maxEntries?: number
	now?: () => number
}): AuthRateLimitStorage {
	const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES
	const now = options?.now ?? Date.now
	const entries = new Map<string, WindowEntry>()

	const prune = (at: number) => {
		for (const [key, entry] of entries) {
			if (at >= entry.expiresAt) entries.delete(key)
		}
		for (const key of entries.keys()) {
			if (entries.size < maxEntries) break
			entries.delete(key)
		}
	}

	return {
		async consume(key, rule) {
			const at = now()
			const current = entries.get(key)

			if (current && at < current.expiresAt) {
				if (current.count >= rule.max) {
					return {
						allowed: false,
						retryAfter: Math.max(1, Math.ceil((current.expiresAt - at) / 1000)),
					}
				}
				current.count += 1
				return { allowed: true, retryAfter: null }
			}

			entries.delete(key)
			prune(at)
			entries.set(key, { count: 1, expiresAt: at + rule.window * 1000 })
			return { allowed: true, retryAfter: null }
		},
	}
}

let registered: AuthRateLimitStorage | null = null
const fallback = createMemoryRateLimitStorage()

/**
 * Register the storage Better Auth's rate limiter should count in, or pass
 * `null` to go back to the process-local store (the backend does this on
 * shutdown, before its Redis connection closes).
 */
export function setAuthRateLimitStorage(storage: AuthRateLimitStorage | null): void {
	registered = storage
}

/** The storage `createAuth()` hands to Better Auth. Resolves the target on every call. */
export const rateLimitStorage: AuthRateLimitStorage = {
	consume: (key, rule) => (registered ?? fallback).consume(key, rule),
}
