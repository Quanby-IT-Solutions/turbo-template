import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// WC-1 / RF1: sign-out must clear memory before disk, and a purge that fails
// must surface — never navigate away as though the device were clean.

const signOut = vi.fn()
const purgePersistedCache = vi.fn()
const writeCacheIdentity = vi.fn()
const routerPush = vi.fn()
const routerRefresh = vi.fn()
const toastError = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}))

vi.mock("sonner", () => ({
	toast: { error: (...args: unknown[]) => toastError(...args) },
}))

vi.mock("@/services/better-auth/auth-client", () => ({
	authClient: { signOut: () => signOut(), getSession: vi.fn() },
}))

vi.mock("@/services/tanstack-query/cache-persistence", () => ({
	purgePersistedCache: () => purgePersistedCache(),
	writeCacheIdentity: (id: string | null) => writeCacheIdentity(id),
}))

const { useSignOutMutation } = await import("./session.hooks")

function renderSignOut() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	})
	const clear = vi.spyOn(queryClient, "clear")

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	return { ...renderHook(() => useSignOutMutation(), { wrapper }), clear }
}

beforeEach(() => {
	vi.clearAllMocks()
	signOut.mockResolvedValue({ error: null })
	purgePersistedCache.mockResolvedValue(undefined)
})

describe("useSignOutMutation", () => {
	it("clears memory, then disk, then navigates", async () => {
		const order: string[] = []
		purgePersistedCache.mockImplementation(async () => {
			order.push("disk")
		})
		routerPush.mockImplementation(() => order.push("navigate"))

		const { result, clear } = renderSignOut()
		clear.mockImplementation(() => {
			order.push("memory")
		})

		result.current.mutate()

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		// RF1: memory -> disk -> done. A disk purge that ran first could be
		// undone by the persister writing the still-populated memory cache back.
		expect(order).toEqual(["memory", "disk", "navigate"])
		expect(writeCacheIdentity).toHaveBeenCalledWith(null)
		expect(routerRefresh).toHaveBeenCalled()
		expect(toastError).not.toHaveBeenCalled()
	})

	it("reports a failed purge instead of navigating away", async () => {
		purgePersistedCache.mockRejectedValue(new Error("IndexedDB unavailable"))

		const { result } = renderSignOut()
		result.current.mutate()

		await waitFor(() => expect(result.current.isError).toBe(true))

		// The snapshot is still on disk, so the user must be told.
		expect(toastError).toHaveBeenCalledTimes(1)
		expect(String(toastError.mock.calls[0]?.[0])).toMatch(/cached data/i)
		// ...and must not be walked to a "signed out, all clear" screen.
		expect(routerPush).not.toHaveBeenCalled()
		expect(routerRefresh).not.toHaveBeenCalled()
	})

	it("does not purge when the sign-out request itself fails", async () => {
		signOut.mockResolvedValue({ error: { message: "network down" } })

		const { result, clear } = renderSignOut()
		result.current.mutate()

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(clear).not.toHaveBeenCalled()
		expect(purgePersistedCache).not.toHaveBeenCalled()
		expect(toastError).toHaveBeenCalledTimes(1)
	})
})
