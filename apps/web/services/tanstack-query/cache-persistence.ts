/**
 * Identity-scoped persistence for the TanStack Query cache (WC-1 / F-04).
 *
 * The persisted cache used to live under one shared, user-agnostic IndexedDB
 * key with no `maxAge` and no buster, and it persisted *everything* — session
 * identity and the full `["rbac","users"]` email directory included. On a
 * shared browser profile the next person got the previous user's data restored
 * at mount, readable from DevTools without ever authenticating.
 *
 * Three controls live here:
 *  1. `NON_PERSISTED_QUERY_ROOTS` — an exclusion list; sensitive roots never
 *     reach disk in the first place (see `shouldPersistQuery` in query-client).
 *  2. Identity-scoped storage keys — user A's snapshot is unreachable from
 *     user B's session even if a purge never ran (crash, expired cookie).
 *  3. `purgePersistedCache()` — the disk half of the RF1 sign-out purge.
 *
 * Risky Flow **RF1**: the order is memory → disk → done. A purge that throws
 * must not leave the disk copy behind, so the delete is retried.
 */

import { del, keys } from "idb-keyval"

/** Prefix for every cache bucket this app writes to IndexedDB. */
export const PERSISTED_CACHE_KEY_PREFIX = "turbo-template-query-cache"

/**
 * The persister's default key, used before WC-1 introduced identity scoping.
 * Purged alongside our own buckets so upgrading clients don't keep a
 * pre-fix snapshot on disk forever.
 */
export const LEGACY_PERSISTED_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE"

/**
 * Bump on any change to persisted shapes (query keys, serializer, this module)
 * to discard every existing snapshot. TanStack drops a restored cache whose
 * buster differs from the current one.
 */
export const PERSISTED_CACHE_BUSTER = "wc1-1"

/**
 * How long a restored snapshot may be. Deliberately far below the 24h `gcTime`
 * the in-memory cache uses: an unattended browser should not repaint a
 * yesterday-old view of someone's data.
 */
export const PERSISTED_CACHE_MAX_AGE = 1000 * 60 * 60 * 2 // 2 hours

/** Bucket used before any session is known, and after sign-out. */
export const ANONYMOUS_CACHE_IDENTITY = "anon"

/** localStorage slot holding the *hashed* id of the last known signed-in user. */
const IDENTITY_STORAGE_KEY = "turbo-template-cache-identity"

/**
 * FNV-1a. Not a security boundary — it only namespaces cache buckets. Hashing
 * keeps the raw user id out of localStorage, where it would be one more
 * durable identifier sitting on a shared profile.
 */
function hashIdentity(userId: string): string {
	let hash = 0x811c9dc5
	for (let i = 0; i < userId.length; i++) {
		hash ^= userId.charCodeAt(i)
		hash = Math.imul(hash, 0x01000193) >>> 0
	}
	return hash.toString(36)
}

/** The IndexedDB key for a given identity. */
export function persistedCacheKeyFor(identity: string): string {
	return `${PERSISTED_CACHE_KEY_PREFIX}:${identity}`
}

/**
 * Current cache identity, read synchronously so the persister can derive its
 * key on every storage call without waiting on a session round-trip.
 */
export function readCacheIdentity(): string {
	if (typeof window === "undefined") return ANONYMOUS_CACHE_IDENTITY

	try {
		return window.localStorage.getItem(IDENTITY_STORAGE_KEY) || ANONYMOUS_CACHE_IDENTITY
	} catch {
		// Private mode / storage disabled: fall back to the anonymous bucket
		// rather than sharing one bucket across identities.
		return ANONYMOUS_CACHE_IDENTITY
	}
}

/** Record (or clear, with `null`) the identity that owns the persisted cache. */
export function writeCacheIdentity(userId: string | null | undefined): void {
	if (typeof window === "undefined") return

	try {
		if (!userId) {
			window.localStorage.removeItem(IDENTITY_STORAGE_KEY)
			return
		}
		window.localStorage.setItem(IDENTITY_STORAGE_KEY, hashIdentity(userId))
	} catch {
		// Storage unavailable — the anonymous bucket is the safe default.
	}
}

/**
 * Storage adapter for `createAsyncStoragePersister` that rewrites the
 * persister's logical key into an identity-scoped one at call time. Reading it
 * per call (rather than at construction) means a sign-in mid-session starts
 * writing to the new bucket immediately, with no provider remount.
 */
export function createIdentityScopedStorage(idb: {
	get: (key: string) => Promise<string | undefined>
	set: (key: string, value: string) => Promise<void>
	del: (key: string) => Promise<void>
}) {
	const scoped = (key: string) => `${key}:${readCacheIdentity()}`

	return {
		getItem: async (key: string) => (await idb.get(scoped(key))) ?? null,
		setItem: (key: string, value: string) => idb.set(scoped(key), value),
		removeItem: (key: string) => idb.del(scoped(key)),
	}
}

/** True for any IndexedDB key this app owns, including the pre-WC-1 default. */
export function isPersistedCacheKey(key: IDBValidKey): key is string {
	return (
		typeof key === "string" &&
		(key === LEGACY_PERSISTED_CACHE_KEY || key.startsWith(`${PERSISTED_CACHE_KEY_PREFIX}:`))
	)
}

/**
 * Delete every cache bucket from IndexedDB — not just the current identity's.
 * Sign-out is the one moment we can be sure nothing on this profile should be
 * restorable, so a bucket abandoned by an earlier crashed session goes too.
 *
 * RF1: retried, because a purge that throws must not leave the disk copy.
 */
export async function purgePersistedCache(attempts = 3): Promise<void> {
	if (typeof window === "undefined") return

	let lastError: unknown

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const storedKeys = await keys()
			await Promise.all(storedKeys.filter(isPersistedCacheKey).map(key => del(key)))
			return
		} catch (error) {
			lastError = error
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("Failed to purge the persisted query cache")
}
