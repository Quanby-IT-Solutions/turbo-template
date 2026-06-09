import { Injectable } from "@nestjs/common"
import { LRUCache } from "lru-cache"

export type ResolvedPermissionSet = {
	roleNames: Set<string>
	permissionNames: Set<string>
}

@Injectable()
export class RbacCacheService {
	private readonly cache: LRUCache<string, ResolvedPermissionSet>

	constructor() {
		this.cache = new LRUCache<string, ResolvedPermissionSet>({
			max: 1000,
			ttl: 60_000,
			ttlAutopurge: false,
		})
	}

	get(userId: string): ResolvedPermissionSet | undefined {
		return this.cache.get(userId)
	}

	set(userId: string, set: ResolvedPermissionSet): void {
		this.cache.set(userId, set)
	}

	invalidate(userId: string): void {
		this.cache.delete(userId)
	}

	/**
	 * Drop every cached entry. Used after role/permission changes that affect
	 * the effective access of many users at once (the cache is keyed per user,
	 * so a single role edit cannot be invalidated by user id alone).
	 */
	clear(): void {
		this.cache.clear()
	}
}
