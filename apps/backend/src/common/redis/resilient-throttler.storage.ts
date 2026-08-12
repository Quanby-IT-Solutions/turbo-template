import { Logger } from "@nestjs/common"
import type { ThrottlerStorage } from "@nestjs/throttler"
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface"

/**
 * Redis-backed throttle storage that fails **open** (AB-2 / F-38).
 *
 * `ThrottlerStorageRedisService` propagates connection errors, and the
 * ThrottlerGuard turns those into a 500. That converts a Redis outage into a
 * total outage: every request fails, including reads that were never rate
 * limited in any meaningful sense. Measured directly — with Redis unreachable
 * the unwrapped storage returned 500 for health, sign-in and permission checks
 * alike.
 *
 * The throttler is a supporting abuse control, not a correctness boundary, so
 * when its counter store is unreachable the deliberate choice is to let
 * requests through and say so loudly. This is the opposite of the RBAC cache's
 * fail-closed behaviour, and the asymmetry is the point: the RBAC cache guards
 * who may do what, while this guards how often.
 */
export class ResilientThrottlerStorage implements ThrottlerStorage {
	private readonly logger = new Logger(ResilientThrottlerStorage.name)
	private degraded = false

	constructor(private readonly inner: ThrottlerStorage) {}

	async increment(
		key: string,
		ttl: number,
		limit: number,
		blockDuration: number,
		throttlerName: string
	): Promise<ThrottlerStorageRecord> {
		try {
			const record = await this.inner.increment(key, ttl, limit, blockDuration, throttlerName)

			if (this.degraded) {
				this.degraded = false
				this.logger.log("Throttle store reachable again — rate limits are being enforced")
			}

			return record
		} catch (error) {
			if (!this.degraded) {
				this.degraded = true
				this.logger.error(
					`Throttle store unreachable (${
						error instanceof Error ? error.message : String(error)
					}) — requests are NOT being rate limited until it returns`
				)
			}

			// `totalHits: 0` with `isBlocked: false` reads as "well under the
			// limit", so the guard admits the request.
			return { totalHits: 0, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 }
		}
	}
}
