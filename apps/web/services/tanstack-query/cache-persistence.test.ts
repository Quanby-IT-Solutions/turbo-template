import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// WC-1 / F-04: nothing sensitive reaches IndexedDB, buckets are per-identity,
// and sign-out removes every bucket from disk.

const idbState = new Map<string, string>()
const failures = { keys: 0, set: 0 }

vi.mock("idb-keyval", () => ({
	get: vi.fn(async (key: string) => idbState.get(key)),
	set: vi.fn(async (key: string, value: string) => {
		if (failures.set > 0) {
			failures.set -= 1
			throw new Error("IndexedDB unavailable")
		}
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
	PERSISTED_CACHE_BUSTER,
	PERSISTED_CACHE_KEY_PREFIX,
	PERSISTED_CACHE_MAX_AGE,
	flushPersistedQueryCache,
	persistedCacheKeyFor,
	persistedQueryCacheOptions,
	purgePersistedCache,
	readCacheIdentity,
	writeCacheIdentity,
} = await import("./cache-persistence")

const { getQueryClient } = await import("./query-client")
const { markPersistedCacheRestored, markPersistedCacheRestoring } =
	await import("./persisted-cache-restore")

const { del, get, set } = await import("idb-keyval")

const storage = createIdentityScopedStorage({
	get: key => get<string>(key),
	set: (key, value) => set(key, value),
	del: key => del(key),
})

beforeEach(() => {
	idbState.clear()
	failures.keys = 0
	failures.set = 0
	window.localStorage.clear()
	getQueryClient().clear()
	markPersistedCacheRestored()
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

describe("flushPersistedQueryCache", () => {
	it("writes one identity-scoped snapshot the restore path can read", async () => {
		writeCacheIdentity("user-a")
		const client = getQueryClient()
		client.setQueryData(["todos"], [{ title: "buy milk" }])
		client.setQueryData(["session"], { email: "admin@turbo-template.local" })
		client.setQueryData(["rbac", "users"], [{ email: "hidden@example.com" }])

		await flushPersistedQueryCache()

		const keys = [...idbState.keys()]
		expect(keys).toEqual([persistedCacheKeyFor(readCacheIdentity())])
		expect(keys[0]).toMatch(/^turbo-template-query-cache:/)

		const raw = await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)
		expect(raw).toBe(idbState.get(keys[0]!))

		const parsed = JSON.parse(raw ?? "") as {
			buster: string
			timestamp: number
			clientState: { queries: Array<{ queryKey: unknown[] }> }
		}
		expect(parsed.buster).toBe(PERSISTED_CACHE_BUSTER)
		expect(parsed.buster).toBe(persistedQueryCacheOptions.buster)
		expect(typeof parsed.timestamp).toBe("number")
		expect(parsed.timestamp).toBeGreaterThan(0)

		const roots = parsed.clientState.queries.map(query => query.queryKey[0])
		expect(roots).toContain("todos")
		expect(roots).not.toContain("session")
		expect(roots).not.toContain("rbac")
		expect(raw).toContain("buy milk")
		expect(raw).not.toContain("admin@turbo-template.local")
		expect(raw).not.toContain("hidden@example.com")
	})

	it("keeps paused mutations in the shared persist options", () => {
		expect(persistedQueryCacheOptions.shouldDehydrateMutation({ state: { isPaused: true } })).toBe(
			true
		)
		expect(persistedQueryCacheOptions.shouldDehydrateMutation({ state: { isPaused: false } })).toBe(
			false
		)
	})

	it("does not overwrite a snapshot, including a paused mutation, while restore is in progress", async () => {
		writeCacheIdentity("user-a")
		const stored = JSON.stringify({
			buster: PERSISTED_CACHE_BUSTER,
			timestamp: 1,
			clientState: {
				mutations: [
					{
						state: { isPaused: true, variables: { title: "offline edit" } },
					},
				],
				queries: [{ queryKey: ["todos"], state: { data: [{ title: "saved" }] } }],
			},
		})
		await storage.setItem(PERSISTED_CACHE_KEY_PREFIX, stored)
		getQueryClient().setQueryData(["todos"], [{ title: "empty client" }])
		markPersistedCacheRestoring()

		await flushPersistedQueryCache()

		expect(await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)).toBe(stored)
		expect(idbState.size).toBe(1)

		markPersistedCacheRestored()
		await flushPersistedQueryCache()

		const written = await storage.getItem(PERSISTED_CACHE_KEY_PREFIX)
		expect(written).not.toBe(stored)
		expect(written).toContain("empty client")
		expect(written).not.toContain("offline edit")
	})

	it("swallows a storage failure without logging", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		const log = vi.spyOn(console, "log").mockImplementation(() => {})
		failures.set = 1
		getQueryClient().setQueryData(["todos"], [{ title: "buy milk" }])

		await expect(flushPersistedQueryCache()).resolves.toBeUndefined()

		expect(idbState.size).toBe(0)
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
		expect(log).not.toHaveBeenCalled()
		error.mockRestore()
		warn.mockRestore()
		log.mockRestore()
	})
})

describe("snapshot lifetime", () => {
	it("expires a restored snapshot well before the 24h in-memory gcTime", () => {
		const twentyFourHours = 1000 * 60 * 60 * 24

		expect(PERSISTED_CACHE_MAX_AGE).toBeLessThan(twentyFourHours / 4)
		expect(PERSISTED_CACHE_MAX_AGE).toBeGreaterThan(0)
	})
})
