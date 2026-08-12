import { Logger } from "@nestjs/common"
import Redis from "ioredis"

import { env } from "@/config/env.config"

/** DI token for the shared Redis connection, or null when none is configured. */
export const REDIS_CLIENT = Symbol("REDIS_CLIENT")

export type RedisClient = Redis | null

const logger = new Logger("Redis")

/**
 * Shared Redis connection for the throttler and the RBAC permission cache (AB-2).
 *
 * ## Why this exists
 *
 * Both consumers were process-local. In the ASG topology that means rate limits
 * multiply by instance count — a "10 per minute" limit becomes 10×N — and a
 * revoked permission keeps working on every instance except the one that
 * revoked it, until its TTL lapses. F-02 was masking this: while the throttle
 * key was client-controlled, per-instance counters were not the binding
 * problem. They are now.
 *
 * ## Degradation, deliberately different per consumer
 *
 * - **RBAC cache — fail closed.** Every read falls through to the database.
 *   Slower, always correct. A permission cache that keeps answering from a
 *   connection it can no longer verify is how revoked access survives.
 * - **Throttler — fail open.** Requests are allowed rather than refused. The
 *   throttler protects against abuse; refusing all traffic because the
 *   rate-limit *counter* is unavailable converts a dependency outage into a
 *   full outage. This is a deliberate availability-over-enforcement choice for
 *   a supporting control, and the opposite of the RBAC decision above because
 *   the RBAC cache guards correctness, not availability.
 *
 * Neither path crashes the app, and both log once rather than per request.
 */
export function createRedisClient(): RedisClient {
	if (!env.REDIS_URL) {
		logger.warn(
			"REDIS_URL is not set — the throttler and RBAC cache stay process-local. " +
				"Single instance: fine. Multiple instances: rate limits multiply by instance " +
				"count and revoked permissions linger until the per-instance TTL lapses."
		)
		return null
	}

	const client = new Redis(env.REDIS_URL, {
		keyPrefix: `${env.REDIS_KEY_PREFIX}:`,
		// Never queue commands while disconnected: a queued permission lookup
		// that resolves minutes later is worse than an immediate miss that falls
		// through to the database.
		enableOfflineQueue: false,
		maxRetriesPerRequest: 1,
		// Bounded backoff so a long outage does not become a reconnect storm.
		retryStrategy: attempt => Math.min(attempt * 200, 5_000),
		lazyConnect: false,
	})

	// `error` must have a listener or ioredis raises an unhandled 'error' event
	// and takes the process down. Logged once per transition, not per failure.
	let reportedDown = false
	client.on("error", error => {
		if (!reportedDown) {
			reportedDown = true
			logger.error(
				`Redis unavailable (${error.message}). RBAC cache falls through to the database; ` +
					"throttling is not enforced until the connection returns."
			)
		}
	})
	client.on("ready", () => {
		if (reportedDown) {
			reportedDown = false
			logger.log("Redis connection restored")
		}
	})

	return client
}
