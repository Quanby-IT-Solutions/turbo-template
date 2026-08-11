"use client"

import { useIsRestoring } from "@tanstack/react-query"

/**
 * The subset of a query result that decides whether a loading placeholder shows.
 */
interface QueryLoadingSource {
	isPending: boolean
	isLoading: boolean
}

/**
 * Returns a predicate for "this query has nothing to show yet".
 *
 * Why this exists rather than reading `query.isLoading` directly (WC-1):
 * `isLoading` is `isPending && isFetching`. While `PersistQueryClientProvider`
 * restores the IndexedDB snapshot it holds every observer in the `isRestoring`
 * state, where `fetchStatus` is pinned to `idle` — so `isLoading` is **false**
 * even though there is no data. The server has no persister and no restore
 * phase, so it renders the same component with `isLoading === true`.
 *
 * The result was a hydration mismatch on every page whose placeholder branches
 * on `isLoading`: the server sent a skeleton, the client's first render drew
 * the data branch with `undefined` in it, and React threw away and re-rendered
 * the tree. Treating "restoring" as loading makes both renders agree and also
 * removes the empty-value flash before the snapshot lands.
 *
 * `isLoading` (not `isPending`) stays the base term deliberately: a query that
 * is pending because it is disabled or because `networkMode: "online"` paused
 * it offline must keep rendering its real state, not an endless skeleton.
 */
export function useIsQueryLoading(): (query: QueryLoadingSource) => boolean {
	const isRestoring = useIsRestoring()

	return query => query.isLoading || (isRestoring && query.isPending)
}
