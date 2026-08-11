import { cache } from "react"
import { StandardRPCJsonSerializer } from "@orpc/client/standard"
import { defaultShouldDehydrateQuery, isServer, QueryClient } from "@tanstack/react-query"

const serializer = new StandardRPCJsonSerializer({ customJsonSerializers: [] })

// Serializer-aware dehydration/hydration helpers. Exported so both the
// QueryClient `defaultOptions` (SSR hydration) and the IndexedDB persistence
// path (PersistQueryClientProvider) reuse the exact same oRPC semantics — the
// persister does NOT inherit these from the QueryClient defaults.

export function serializeQueryData(data: unknown) {
	const [json, meta] = serializer.serialize(data)
	return { json, meta }
}

export function deserializeQueryData(data: { json: unknown; meta: unknown }) {
	return serializer.deserialize(
		data.json,
		data.meta as Parameters<typeof serializer.deserialize>[1]
	)
}

// Loosely-typed params (structural supertypes of `Query`/`Mutation`) so these
// helpers stay assignable across the slightly different `@tanstack/query-core`
// versions pulled in by react-query and react-query-persist-client.
export function shouldDehydrateQuery(query: { state: { status: string } }) {
	return (
		defaultShouldDehydrateQuery(query as Parameters<typeof defaultShouldDehydrateQuery>[0]) ||
		query.state.status === "pending"
	)
}

export function shouldDehydrateMutation(mutation: { state: { isPaused: boolean } }) {
	return mutation.state.isPaused
}

/**
 * Query-key roots that must never be written to IndexedDB (WC-1 / F-04).
 *
 * `session` carries the signed-in identity; `rbac` carries the full user
 * directory including every email address. Persisting either hands the next
 * person on a shared browser profile a readable copy of the previous user's
 * data. This is an exclusion, not an allowlist of safe keys — new sensitive
 * roots must be added here, and anything unrecognised stays out by falling
 * through to the SSR predicate only when its root is not listed.
 */
export const NON_PERSISTED_QUERY_ROOTS = ["session", "rbac"] as const

/**
 * The string labels in a query key's first segment. Handles both plain keys
 * (`["session"]`, `["rbac","users"]`) and oRPC's nested path segment
 * (`[["orpc","example","todo","list"], { type, input }]`).
 */
function queryKeyLabels(queryKey: readonly unknown[]): string[] {
	const [first] = queryKey

	if (typeof first === "string") return [first]
	if (Array.isArray(first)) return first.filter((part): part is string => typeof part === "string")
	return []
}

/**
 * Whether a query may be written to the persisted (IndexedDB) cache.
 *
 * Deliberately separate from `shouldDehydrateQuery`: SSR dehydration streams
 * to the same client that made the request and may legitimately carry session
 * data, while persistence outlives the session and the tab.
 */
export function shouldPersistQuery(query: {
	queryKey: readonly unknown[]
	state: { status: string }
}) {
	const denied = new Set<string>(NON_PERSISTED_QUERY_ROOTS)
	if (queryKeyLabels(query.queryKey).some(label => denied.has(label))) {
		return false
	}

	return shouldDehydrateQuery(query)
}

/**
 * Creates a QueryClient with oRPC-compatible key hashing and dehydration/hydration.
 * Safe for both oRPC and non-oRPC queries (e.g. session).
 */
export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn(queryKey) {
					const [json, meta] = serializer.serialize(queryKey)
					return JSON.stringify({ json, meta })
				},
				// Serve cached data first, then hit the network — keeps the UI
				// responsive while offline and lets persisted cache paint instantly.
				networkMode: "offlineFirst",
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching immediately on the client
				staleTime: 30 * 1000,
				// Retain cached data for 24h so the persister has something to
				// restore across reloads/offline sessions.
				gcTime: 1000 * 60 * 60 * 24,
			},
			mutations: {
				// Mutations require a live connection; pause them while offline so
				// they can resume once connectivity returns.
				networkMode: "online",
			},
			dehydrate: {
				shouldDehydrateQuery,
				// Persist paused (offline) mutations so they survive reloads and
				// resume when the network comes back.
				shouldDehydrateMutation,
				serializeData: serializeQueryData,
			},
			hydrate: {
				deserializeData: deserializeQueryData,
			},
		},
	})

const getServerQueryClient = cache(createQueryClient)

let clientQueryClientSingleton: QueryClient | undefined = undefined

/**
 * Returns a QueryClient: per-request cached on server, singleton on client.
 */
export const getQueryClient = () => {
	if (isServer) return getServerQueryClient()
	clientQueryClientSingleton ??= createQueryClient()
	return clientQueryClientSingleton
}
