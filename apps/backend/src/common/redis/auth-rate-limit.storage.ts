import { Logger } from "@nestjs/common"
import type Redis from "ioredis"

// The subpath, not the package root: the root also loads the whole Better Auth
// config, which this module has no use for.
import { createMemoryRateLimitStorage, type AuthRateLimitStorage } from "@repo/auth/rate-limit-storage"

/**
 * Better Auth's own rate limiter, counted in the shared Redis.
 *
 * ## Why this exists
 *
 * Better Auth answers sign-in, sign-up, password reset and verification before
 * Nest sees the request, so the Nest throttler never counts those routes.
 * Better Auth limits them itself, and out of the box it counts in process
 * memory: with N instances behind the load balancer, "3 sign-in attempts per
 * 10 s" becomes 3×N, and every restart forgets the count. Registering this
 * storage (RedisModule does it at startup) gives every instance one count.
 *
 * ## Why a Lua script
 *
 * Better Auth asks for one atomic check-and-increment per request. The script
 * increments and sets the expiry inside Redis, so two instances racing on the
 * same key still count correctly. It keeps Better Auth's own memory rule (the
 * same one `@repo/auth` falls back to): an allowed request restarts the
 * window, a refused one does not, and the count resets once a full window
 * passes with no allowed request. A refused request re-arms the expiry only
 * when the key has none, which repairs a key whose expiry was somehow lost;
 * otherwise that client would stay locked out until someone deleted the key by
 * hand. `EVAL` works on every Redis from 2.6.
 *
 * ## Degradation: back to counting per process
 *
 * While Redis is unreachable, each instance counts in its own memory store,
 * which is exactly how Better Auth counted before this file existed. That
 * differs from the Nest throttler, which fails fully open (see
 * redis.provider.ts) because its only alternative is refusing all traffic.
 * Here a per-process count costs nothing in availability, and letting every
 * sign-in attempt through during an outage would hand a password-guessing
 * client the very window it needs. Logged once on loss and once on recovery,
 * never per request.
 */

/**
 * KEYS[1] is the namespaced key, ARGV[1] the window in seconds, ARGV[2] the
 * max. Returns `{ count, ttlMs }`.
 */
export const AUTH_RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local window = tonumber(ARGV[1]) * 1000
if count <= tonumber(ARGV[2]) then
  redis.call('PEXPIRE', KEYS[1], window)
  return { count, window }
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], window)
  ttl = window
end
return { count, ttl }
`

/**
 * Kept apart from the Nest throttler's keys, which share this connection and
 * its `REDIS_KEY_PREFIX`.
 */
const KEY_NAMESPACE = "auth-rate-limit:"

export function createRedisAuthRateLimitStorage(client: Redis): AuthRateLimitStorage {
	const logger = new Logger("AuthRateLimitStorage")
	const fallback = createMemoryRateLimitStorage()
	let degraded = false

	return {
		async consume(key, rule) {
			try {
				const [count, ttl] = (await client.eval(
					AUTH_RATE_LIMIT_SCRIPT,
					1,
					`${KEY_NAMESPACE}${key}`,
					String(rule.window),
					String(rule.max)
				)) as [number, number]

				if (degraded) {
					degraded = false
					logger.log("Auth rate-limit store reachable again: sign-in limits are shared again")
				}

				if (count <= rule.max) {
					return { allowed: true, retryAfter: null }
				}
				return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) }
			} catch (error) {
				// Status `end` means the client was closed on purpose (shutdown), not
				// an outage: no log line, and no recovery line armed. The fallback
				// still counts either way.
				if (client.status !== "end" && !degraded) {
					degraded = true
					logger.error(
						`Auth rate-limit store unreachable (${
							error instanceof Error ? error.message : String(error)
						}): Better Auth limits are counted per instance until it returns`
					)
				}
				return fallback.consume(key, rule)
			}
		},
	}
}
