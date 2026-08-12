import { Inject, Injectable, Logger } from "@nestjs/common"

import { REDIS_CLIENT, type RedisClient } from "@/common/redis/redis.provider"

export type ResolvedPermissionSet = {
	roleNames: Set<string>
	permissionNames: Set<string>
}

/** Wire format — Sets do not survive JSON. */
type SerializedPermissionSet = {
	roleNames: string[]
	permissionNames: string[]
}

/** Seconds an entry may live. Matches the previous in-memory TTL. */
const TTL_SECONDS = 60

/** Namespace for per-user entries, under the client's global key prefix. */
const USER_KEY = "rbac:user:"

/**
 * Cache of each user's resolved roles and permissions (AB-2 / F-38).
 *
 * Previously an in-process LRU, which in the ASG topology meant a revoked role
 * kept working on every instance except the one that revoked it until its TTL
 * lapsed. The cache now lives in Redis, so an invalidation from any instance is
 * seen by all of them.
 *
 * **Degradation is fail-closed**: when Redis is unavailable every read reports a
 * miss and the caller recomputes from the database. Slower, always correct. The
 * alternative — serving permissions from a store we can no longer invalidate —
 * is precisely how revoked access survives, so it is not offered.
 *
 * Writes are fire-and-forget: a failed `set` only costs a recomputation, and
 * making callers await it would put the cache on the critical path of every
 * permission check for no correctness gain. A failed **invalidate** is
 * different and is escalated — see {@link invalidate}.
 */
@Injectable()
export class RbacCacheService {
	private readonly logger = new Logger(RbacCacheService.name)

	constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

	/** True when this instance has no shared store and is running degraded. */
	get isShared(): boolean {
		return this.redis !== null
	}

	async get(userId: string): Promise<ResolvedPermissionSet | undefined> {
		if (!this.redis) return undefined

		try {
			const raw = await this.redis.get(`${USER_KEY}${userId}`)
			if (!raw) return undefined

			const parsed = JSON.parse(raw) as SerializedPermissionSet
			return {
				roleNames: new Set(parsed.roleNames),
				permissionNames: new Set(parsed.permissionNames),
			}
		} catch {
			// Unreachable, or a value this version cannot read. Either way the
			// safe answer is "no cached entry" — the caller goes to the database.
			return undefined
		}
	}

	async set(userId: string, value: ResolvedPermissionSet): Promise<void> {
		if (!this.redis) return

		const payload: SerializedPermissionSet = {
			roleNames: [...value.roleNames],
			permissionNames: [...value.permissionNames],
		}

		try {
			await this.redis.set(`${USER_KEY}${userId}`, JSON.stringify(payload), "EX", TTL_SECONDS)
		} catch {
			// A cache write that fails costs one recomputation. Not worth failing
			// the request the user is waiting on.
		}
	}

	/**
	 * Drop one user's entry, after a change to their role assignments.
	 *
	 * Throws when the store is reachable but rejects the delete. Callers invoke
	 * this **after** the mutation has committed (RF5), so a silent failure would
	 * leave the old permission set answering for up to a full TTL — the exact
	 * window this ticket exists to close. Letting it surface is the honest
	 * outcome: the change did land, and the caller can report that the cache did
	 * not clear.
	 */
	async invalidate(userId: string): Promise<void> {
		if (!this.redis) return

		try {
			await this.redis.del(`${USER_KEY}${userId}`)
		} catch (error) {
			this.logger.error(
				`Failed to invalidate the RBAC cache for ${userId}; stale permissions may be ` +
					`served for up to ${TTL_SECONDS}s`,
				error instanceof Error ? error.stack : undefined
			)
			throw error
		}
	}

	/**
	 * Drop every entry, after a change that alters many users' effective access
	 * at once — a role's permission set, or a role being deleted. The cache is
	 * keyed per user, so those cannot be invalidated by user id.
	 *
	 * Scans rather than issuing `FLUSHDB`: the key space may be shared with
	 * other environments or other consumers, and flushing it would take out the
	 * throttle counters too.
	 */
	async clear(): Promise<void> {
		if (!this.redis) return

		const prefix = this.redis.options.keyPrefix ?? ""
		const match = `${prefix}${USER_KEY}*`

		try {
			let cursor = "0"
			do {
				const [next, keys] = await this.redis.scan(cursor, "MATCH", match, "COUNT", 500)
				cursor = next
				if (keys.length) {
					// SCAN returns fully-qualified keys; `del` would re-apply the
					// prefix, so strip it back off first.
					await this.redis.del(...keys.map(key => key.slice(prefix.length)))
				}
			} while (cursor !== "0")
		} catch (error) {
			this.logger.error(
				"Failed to clear the RBAC cache; stale permissions may be served for up to " +
					`${TTL_SECONDS}s`,
				error instanceof Error ? error.stack : undefined
			)
			throw error
		}
	}
}
