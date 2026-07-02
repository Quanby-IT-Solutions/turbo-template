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

import { setupOnlineManagerBridge } from "@/features/pwa/lib/online-manager-bridge"
import { registerTodosMutationDefaults } from "@/features/todos/api/todos.hooks"

import {
	deserializeQueryData,
	getQueryClient,
	serializeQueryData,
	shouldDehydrateMutation,
	shouldDehydrateQuery,
} from "./query-client"

// IndexedDB-backed AsyncStorage adapter for the persister. Wrapped in a
// `typeof window` guard so it is never constructed on the server.
function createIdbPersister() {
	if (typeof window === "undefined") return null

	return createAsyncStoragePersister({
		storage: {
			getItem: key => get(key),
			setItem: (key, value) => set(key, value),
			removeItem: key => del(key),
		},
	})
}

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
	const queryClient = getQueryClient()

	// Instantiate the persister once, lazily, and only on the client.
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
				// PersistQueryClientProvider does NOT merge these with the
				// QueryClient defaults — it uses them directly. So the IndexedDB
				// snapshot must explicitly reuse the same serializer-aware
				// dehydrate/hydrate logic as query-client.ts, or restored cache
				// loses oRPC serialization semantics.
				dehydrateOptions: {
					shouldDehydrateQuery,
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
			onSuccess={() => {
				registerTodosMutationDefaults(queryClient)
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
