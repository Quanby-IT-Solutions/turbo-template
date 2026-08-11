import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// WC-1 / F-04: nothing sensitive reaches IndexedDB, buckets are per-identity,
// and sign-out removes every bucket from disk.

const idbState = new Map<string, string>()
const failures = { keys: 0 }

vi.mock("idb-keyval", () => ({
	get: vi.fn(async (key: string) => idbState.get(key)),
	set: vi.fn(async (key: string, value: string) => {
		idbState.set(key, value)
	}),
	del: vi.fn(async (key: string) => {
		idbState.delete(key)
	}),
	keys: vi.fn(async () => {
		if (failures.keys > 0) {
			failures.keys -= 1
			throw new Error("IndexedDB unavailable")
		}
		return [...idbState.keys()]
	}),
}))

const {
	ANONYMOUS_CACHE_IDENTITY,
	createIdentityScopedStorage,
	isPersistedCacheKey,
	LEGACY_PERSISTED_CACHE_KEY,
	PERSISTED_CACHE_KEY_PREFIX,
	PERSISTED_CACHE_MAX_AGE,
	persistedCacheKeyFor,
	purgePersistedCache,
	readCacheIdentity,
	writeCacheIdentity,
} = await import("./cache-persistence")

const { del, get, set } = await import("idb-keyval")

const storage = createIdentityScopedStorage({
	get: key => get<string>(key),
	set: (key, value) => set(key, value),
	del: key => del(key),
})

beforeEach(() => {
	idbState.clear()
	failures.keys = 0
	window.localStorage.clear()
})

afterEach(() => {
	vi.clearAllMocks()
})

describe("cache identity", () => {
	it("falls back to the anonymous bucket before any session is known", () => {
		expect(readCacheIdentity()).toBe(ANONYMOUS_CACHE_IDENTITY)
	})

	it("never stores the raw user id in localStorage", () => {
		writeCacheIdentity("seed-user-admin")

		const stored = window.localStorage.getItem("turbo-template-cache-identity")

		expect(stored).toBeTruthy()
		expect(stored).not.toBe("seed-user-admin")
		expect(stored).not.toContain("seed-user-admin")
	})

	it("gives different users different identities and is stable per user", () => {
		writeCacheIdentity("user-a")
		const first = readCacheIdentity()
		writeCacheIdentity("user-b")
		const second = readCacheIdentity()
		writeCacheIdentity("user-a")

		expect(first).not.toBe(second)
		expect(readCacheIdentity()).toBe(first)
	})

	it("returns to the anonymous bucket when the identity is cleared", () => {
		writeCacheIdentity("user-a")
		writeCacheIdentity(null)

		expect(readCacheIdentity()).toBe(ANONYMOUS_CACHE_IDENTITY)
	})
})

describe("identity-scoped storage", () => {
	it("writes under a key that includes the current identity", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")

		expect([...idbState.keys()]).toEqual([persistedCacheKeyFor(readCacheIdentity())])
		expect([...idbState.keys()][0]).not.toBe(LEGACY_PERSISTED_CACHE_KEY)
	})

	it("does not hand user A's snapshot to user B", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")

		writeCacheIdentity("user-b")

		expect(await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)).toBeNull()

		writeCacheIdentity("user-a")
		expect(await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)).toBe("snapshot-a")
	})

	it("does not leak a signed-in snapshot into the anonymous bucket", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")

		writeCacheIdentity(null)

		expect(await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)).toBeNull()
	})

	it("removes only the current identity's bucket on removeItem", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")
		writeCacheIdentity("user-b")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-b")

		await storage.removeItem(PERSISTED_CACHE_KEY_PREFIX)

		expect(idbState.size).toBe(1)
		writeCacheIdentity("user-a")
		expect(await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)).toBe("snapshot-a")
	})
})

describe("purgePersistedCache", () => {
	it("deletes every cache bucket, including one left by a crashed session", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")
		writeCacheIdentity("user-b")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-b")

		await purgePersistedCache()

		expect(idbState.size).toBe(0)
	})

	it("deletes the pre-WC-1 shared bucket so upgrading clients are cleaned too", async () => {
		idbState.set(LEGACY_PERSISTED_CACHE_KEY, "pre-fix snapshot with emails")

		await purgePersistedCache()

		expect(idbState.has(LEGACY_PERSISTED_CACHE_KEY)).toBe(false)
	})

	it("leaves unrelated IndexedDB entries alone", async () => {
		idbState.set("some-other-app-key", "not ours")

		await purgePersistedCache()

		expect(idbState.get("some-other-app-key")).toBe("not ours")
	})

	it("retries a failing purge rather than leaving the disk copy behind", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")
		failures.keys = 2

		await purgePersistedCache()

		expect(idbState.size).toBe(0)
	})

	it("throws when every retry fails, so sign-out reports the failure", async () => {
		writeCacheIdentity("user-a")
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, "snapshot-a")
		failures.keys = 5

		await expect(purgePersistedCache()).rejects.toThrow(/IndexedDB unavailable/)
		expect(idbState.size).toBe(1)
	})
})

describe("cache key ownership", () => {
	it.each([
		[persistedCacheKeyFor("anon"), true],
		[persistedCacheKeyFor("abc123"), true],
		[LEGACY_PERSISTED_CACHE_KEY, true],
		["turbo-template-query-cache", false],
		["unrelated", false],
		[42, false],
	])("isPersistedCacheKey(%s) === %s", (key, expected) => {
		expect(isPersistedCacheKey(key as IDBValidKey)).toBe(expected)
	})
})

describe("snapshot lifetime", () => {
	it("expires a restored snapshot well before the 24h in-memory gcTime", () => {
		const twentyFourHours = 1000 * 60 * 60 * 24

		expect(PERSISTED_CACHE_MAX_AGE).toBeLessThan(twentyFourHours / 4)
		expect(PERSISTED_CACHE_MAX_AGE).toBeGreaterThan(0)
	})
})
