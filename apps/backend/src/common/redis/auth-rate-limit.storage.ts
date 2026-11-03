import { Logger } from "@nestjs/common"
import type Redis from "ioredis"

import type { AuthRateLimitStorage } from "@repo/auth"

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
 * increments, reads the remaining TTL, and sets the window only when the key
 * has no TTL, all inside Redis, so two instances racing on the same key still
 * count correctly. Keying the EXPIRE on "no TTL" rather than "first hit" also
 * repairs a key whose expiry was somehow lost, which would otherwise lock that
 * client out until someone deleted it by hand. `EVAL` works on every Redis
 * from 2.6; `EXPIRE ... NX` would need 7.0.
 *
 * ## Degradation: fail open
 *
 * Same choice, and the same reasoning, as the Nest throttler (see
 * redis.provider.ts): a Redis outage lets requests through rather than turning
 * a counter outage into a sign-in outage. Logged once on loss and once on
 * recovery, never per request.
 */

/** KEYS[1] is the namespaced key, ARGV[1] the window in seconds. Returns `{ count, ttlMs }`. */
export const AUTH_RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1]) * 1000
end
return { count, ttl }
`

/**
 * Kept apart from the Nest throttler's keys, which share this connection and
 * its `REDIS_KEY_PREFIX`.
 */
const KEY_NAMESPACE = "auth-rate-limit:"

const ALLOWED = { allowed: true, retryAfter: null } as const

export function createRedisAuthRateLimitStorage(client: Redis): AuthRateLimitStorage {
	const logger = new Logger("AuthRateLimitStorage")
	let degraded = false

	return {
		async consume(key, rule) {
			try {
				const [count, ttl] = (await client.eval(
					AUTH_RATE_LIMIT_SCRIPT,
					1,
					`${KEY_NAMESPACE}${key}`,
					String(rule.window)
				)) as [number, number]

				if (degraded) {
					degraded = false
					logger.log("Auth rate-limit store reachable again: sign-in limits are shared again")
				}

				if (count <= rule.max) {
					return { ...ALLOWED }
				}
				return { allowed: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) }
			} catch (error) {
				// Status `end` means the client was closed on purpose (shutdown), not
				// an outage: no log line, and no recovery line armed.
				if (client.status !== "end" && !degraded) {
					degraded = true
					logger.error(
						`Auth rate-limit store unreachable (${
							error instanceof Error ? error.message : String(error)
						}): Better Auth limits are NOT enforced until it returns`
					)
				}
				return { ...ALLOWED }
			}
		},
	}
}
