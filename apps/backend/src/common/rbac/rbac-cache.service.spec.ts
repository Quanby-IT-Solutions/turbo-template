import { Logger } from "@nestjs/common"

import { RbacCacheService, type ResolvedPermissionSet } from "@/common/rbac/rbac-cache.service"

/**
 * AB-2 / F-38 — the RBAC permission cache on shared storage.
 *
 * The behaviour that matters is what happens when Redis misbehaves. A cache
 * that keeps answering from a store it can no longer invalidate is how a
 * revoked role keeps working, so every failure path here must degrade to "no
 * cached entry" and let the caller recompute from the database.
 */

// The failure paths below log deliberately; keep the expected noise out of the
// test output so a real error still stands out.
beforeAll(() => {
	jest.spyOn(Logger.prototype, "error").mockImplementation(() => {})
})

afterAll(() => {
	jest.restoreAllMocks()
})

const SET: ResolvedPermissionSet = {
	roleNames: new Set(["Admin"]),
	permissionNames: new Set(["users:read", "users:manage"]),
}

/** Minimal in-memory stand-in for the ioredis surface this service uses. */
function fakeRedis(overrides: Partial<Record<string, unknown>> = {}) {
	const store = new Map<string, string>()
	return {
		options: { keyPrefix: "turbo-template:" },
		store,
		get: jest.fn(async (key: string) => store.get(key) ?? null),
		set: jest.fn(async (key: string, value: string) => {
			store.set(key, value)
			return "OK"
		}),
		del: jest.fn(async (...keys: string[]) => {
			let n = 0
			for (const k of keys) if (store.delete(k)) n++
			return n
		}),
		scan: jest.fn(async (cursor: string, _m: string, match: string) => {
			const re = new RegExp(`^${match.replace(/\*/g, ".*")}$`)
			const keys = [...store.keys()].map(k => `turbo-template:${k}`).filter(k => re.test(k))
			return ["0", keys] as [string, string[]]
		}),
		...overrides,
	}
}

describe("without Redis configured (single-instance fallback)", () => {
	const service = new RbacCacheService(null)

	it("reports that it is not shared", () => {
		expect(service.isShared).toBe(false)
	})

	it("always misses, so every caller recomputes from the database", async () => {
		await service.set("user-1", SET)
		await expect(service.get("user-1")).resolves.toBeUndefined()
	})

	it("treats invalidate and clear as no-ops rather than throwing", async () => {
		await expect(service.invalidate("user-1")).resolves.toBeUndefined()
		await expect(service.clear()).resolves.toBeUndefined()
	})
})

describe("with Redis available", () => {
	it("round-trips a permission set through the shared store", async () => {
		const redis = fakeRedis()
		const service = new RbacCacheService(redis as never)

		await service.set("user-1", SET)
		const restored = await service.get("user-1")

		// Sets do not survive JSON; the service must rebuild them.
		expect(restored?.roleNames).toBeInstanceOf(Set)
		expect([...restored!.roleNames]).toEqual(["Admin"])
		expect([...restored!.permissionNames]).toEqual(["users:read", "users:manage"])
	})

	it("bounds every entry with a TTL", async () => {
		const redis = fakeRedis()
		await new RbacCacheService(redis as never).set("user-1", SET)

		expect(redis.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), "EX", 60)
	})

	it("an invalidation on one instance is visible to another", async () => {
		// Two service instances over one store — the multi-instance case F-38 is
		// about. Previously each had its own LRU and a revocation reached only one.
		const redis = fakeRedis()
		const instanceA = new RbacCacheService(redis as never)
		const instanceB = new RbacCacheService(redis as never)

		await instanceA.set("user-1", SET)
		expect(await instanceB.get("user-1")).toBeDefined()

		await instanceA.invalidate("user-1")
		expect(await instanceB.get("user-1")).toBeUndefined()
	})

	it("clears only its own keys, leaving throttle counters alone", async () => {
		const redis = fakeRedis()
		const service = new RbacCacheService(redis as never)

		await service.set("user-1", SET)
		redis.store.set("throttle:1.2.3.4", "7")

		await service.clear()

		expect(redis.store.has("throttle:1.2.3.4")).toBe(true)
		expect(await service.get("user-1")).toBeUndefined()
	})
})

describe("when Redis misbehaves", () => {
	it("reports a miss when the read fails, rather than guessing", async () => {
		const service = new RbacCacheService(
			fakeRedis({ get: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) }) as never
		)

		// Fail closed: the caller recomputes from the database.
		await expect(service.get("user-1")).resolves.toBeUndefined()
	})

	it("reports a miss when the stored value cannot be parsed", async () => {
		const service = new RbacCacheService(
			fakeRedis({ get: jest.fn().mockResolvedValue("not json") }) as never
		)

		await expect(service.get("user-1")).resolves.toBeUndefined()
	})

	it("swallows a failed write, since it only costs a recomputation", async () => {
		const service = new RbacCacheService(
			fakeRedis({ set: jest.fn().mockRejectedValue(new Error("READONLY")) }) as never
		)

		await expect(service.set("user-1", SET)).resolves.toBeUndefined()
	})

	it("surfaces a failed invalidation instead of hiding stale permissions", async () => {
		// Deliberately different from a failed write. Invalidation runs after a
		// role change has committed, so swallowing the failure would leave the
		// old permission set answering for a full TTL — the exact window this
		// ticket closes.
		const service = new RbacCacheService(
			fakeRedis({ del: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) }) as never
		)

		await expect(service.invalidate("user-1")).rejects.toThrow(/ECONNREFUSED/)
	})

	it("surfaces a failed clear for the same reason", async () => {
		const service = new RbacCacheService(
			fakeRedis({ scan: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) }) as never
		)

		await expect(service.clear()).rejects.toThrow(/ECONNREFUSED/)
	})
})
