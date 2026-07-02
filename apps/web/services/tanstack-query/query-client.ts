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
