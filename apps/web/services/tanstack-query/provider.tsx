"use client"

import * as React from "react"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import {
	dehydrate,
	HydrationBoundary,
	QueryClientProvider,
	type QueryClient,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { del, get, set } from "idb-keyval"
import { toast } from "sonner"

import { setupOnlineManagerBridge } from "@/features/pwa/lib/online-manager-bridge"
import { registerTodosMutationDefaults } from "@/features/todos/api/todos.hooks"

import {
	ANONYMOUS_CACHE_IDENTITY,
	createIdentityScopedStorage,
	PERSISTED_CACHE_BUSTER,
	PERSISTED_CACHE_KEY_PREFIX,
	PERSISTED_CACHE_MAX_AGE,
	readCacheIdentity,
	writeCacheIdentity,
} from "./cache-persistence"
import { discardForeignPausedMutations } from "./paused-mutation-identity"
import {
	deserializeQueryData,
	getQueryClient,
	serializeQueryData,
	shouldDehydrateMutation,
	shouldPersistQuery,
} from "./query-client"

// IndexedDB-backed AsyncStorage adapter for the persister. Wrapped in a
// `typeof window` guard so it is never constructed on the server.
//
// WC-1: the key is explicit and identity-scoped (the adapter appends the
// current identity), so one browser profile keeps one bucket per user instead
// of a single shared one.
function createIdbPersister() {
	if (typeof window === "undefined") return null

	return createAsyncStoragePersister({
		key: PERSISTED_CACHE_KEY_PREFIX,
		storage: createIdentityScopedStorage({
			get: key => get<string>(key),
			set: (key, value) => set(key, value),
			del: key => del(key),
		}),
	})
}

/**
 * Records which user owns the persisted cache (WC-1).
 *
 * Mounted by `CacheIdentity` inside the authenticated subtrees rather than by
 * `QueryProvider` itself, because resolving the session is a cookie read and
 * doing that in the root layout makes **every** route dynamic — including
 * `/login`, `/register` and the PWA's `/~offline` fallback, which must stay
 * prerenderable.
 *
 * The stamp happens during render, not in an effect. React runs a child's
 * render before its parent's effects, and `PersistQueryClientProvider` starts
 * its restore in a parent effect — so writing the identity here is guaranteed
 * to land before the first snapshot is read from disk.
 */
export function CacheIdentityStamp({ userId }: Readonly<{ userId: string | null }>) {
	const queryClient = getQueryClient()

	React.useState(() => writeCacheIdentity(userId))

	// A handover within one tab (signing in as someone else) must not carry the
	// previous user's in-memory rows over. Only a swap between two *identified*
	// users needs the clear; anon -> user is a normal first load.
	React.useEffect(() => {
		const previous = readCacheIdentity()
		writeCacheIdentity(userId)
		const next = readCacheIdentity()

		if (previous !== next && previous !== ANONYMOUS_CACHE_IDENTITY) {
			queryClient.clear()
		}
	}, [userId, queryClient])

	return null
}

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
	const queryClient = getQueryClient()

	// Instantiate the persister once, lazily, and only on the client. It reads
	// the cache identity on every storage call, so a stamp from a descendant
	// takes effect without reconstructing anything.
	const [persister] = React.useState(createIdbPersister)

	// Register rehydratable mutation defaults synchronously so newly created
	// mutations have their functions available before any reload. setMutationDefaults
	// is synchronous and idempotent, so calling it on every render is safe.
	registerTodosMutationDefaults(queryClient)

	// Bridge real connectivity into TanStack Query's onlineManager so paused
	// mutations resume when the network actually returns.
	React.useEffect(() => {
		setupOnlineManagerBridge()
	}, [])

	// On the server (or before the persister exists) fall back to the plain
	// provider so SSR/first render stays safe.
	if (!persister) {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools />
			</QueryClientProvider>
		)
	}

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				// WC-1: a restored snapshot expires well before the in-memory
				// 24h gcTime, and the buster discards every snapshot whenever
				// the persisted shape changes.
				maxAge: PERSISTED_CACHE_MAX_AGE,
				buster: PERSISTED_CACHE_BUSTER,
				// PersistQueryClientProvider does NOT merge these with the
				// QueryClient defaults — it uses them directly. So the IndexedDB
				// snapshot must explicitly reuse the same serializer-aware
				// dehydrate/hydrate logic as query-client.ts, or restored cache
				// loses oRPC serialization semantics.
				//
				// `shouldPersistQuery` (not `shouldDehydrateQuery`) applies here:
				// session and rbac data must never reach disk.
				dehydrateOptions: {
					shouldDehydrateQuery: shouldPersistQuery,
					shouldDehydrateMutation,
					serializeData: serializeQueryData,
				},
				hydrateOptions: {
					defaultOptions: {
						deserializeData: deserializeQueryData,
					},
				},
			}}
			// After the persisted state is restored, resume any paused mutations.
			// Without this, writes queued offline stay stuck when the app reopens
			// with connectivity already back — they'd only replay on a future
			// offline→online transition.
			// After the persisted state is restored, discard anything queued by a
			// different identity, THEN resume the rest (WC-3 / F-19). The order is
			// the whole guarantee: once `resumePausedMutations()` starts there is
			// no interception point, and a mutation that has begun replaying has
			// already been sent.
			onSuccess={() => {
				registerTodosMutationDefaults(queryClient)

				const discarded = discardForeignPausedMutations(queryClient)
				if (discarded > 0) {
					toast.warning(
						discarded === 1
							? "1 offline change from a previous session was discarded."
							: `${discarded} offline changes from a previous session were discarded.`,
						{ id: "paused-mutations-discarded" }
					)
				}

				void queryClient.resumePausedMutations()
			}}
		>
			{children}
			<ReactQueryDevtools />
		</PersistQueryClientProvider>
	)
}

interface HydrateClientProps {
	children: React.ReactNode
	client: QueryClient
}

/**
 * Wraps children with HydrationBoundary so dehydrated state from the given QueryClient
 * is hydrated on the client. Use from server components after prefetching.
 */
export function HydrateClient({ children, client }: HydrateClientProps) {
	return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
}
