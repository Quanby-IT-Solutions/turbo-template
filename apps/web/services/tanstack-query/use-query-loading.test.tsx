import * as React from "react"
import { IsRestoringProvider, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useIsQueryLoading } from "./use-query-loading"

// WC-1: the persisted-cache restore pins `fetchStatus` to `idle`, so a query
// with no data reports `isLoading === false` on the client's first render while
// the server rendered the same component with `isLoading === true`. That
// disagreement is a hydration mismatch; this predicate closes it.

function render(isRestoring: boolean) {
	const queryClient = new QueryClient()

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<IsRestoringProvider value={isRestoring}>{children}</IsRestoringProvider>
		</QueryClientProvider>
	)

	return renderHook(() => useIsQueryLoading(), { wrapper }).result
}

// How a query with no data looks in each phase.
const serverRender = { isPending: true, isLoading: true } // pending + fetching
const restoring = { isPending: true, isLoading: false } // pending, fetchStatus idle
const settled = { isPending: false, isLoading: false }
const pausedOffline = { isPending: true, isLoading: false } // networkMode "online"

describe("useIsQueryLoading", () => {
	it("agrees with the server render while the persisted cache is restoring", () => {
		// The whole point: both sides must produce the same branch, or React
		// discards the hydrated tree.
		const onServer = render(false).current(serverRender)
		const onClient = render(true).current(restoring)

		expect(onServer).toBe(true)
		expect(onClient).toBe(true)
	})

	it("reports a settled query as not loading in both phases", () => {
		expect(render(false).current(settled)).toBe(false)
		expect(render(true).current(settled)).toBe(false)
	})

	it("leaves an offline-paused query alone once restore has finished", () => {
		// `networkMode: "online"` leaves the query pending but not fetching. That
		// is a real state, not a restore artefact — showing an endless skeleton
		// for it would be a regression, so the predicate must stay false.
		expect(render(false).current(pausedOffline)).toBe(false)
	})

	it("still reports a genuinely fetching query as loading", () => {
		expect(render(false).current({ isPending: true, isLoading: true })).toBe(true)
	})
})
