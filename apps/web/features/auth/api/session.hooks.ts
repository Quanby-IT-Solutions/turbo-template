"use client"

import { useRouter } from "next/navigation"
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { authClient } from "@/services/better-auth/auth-client"
import {
	purgePersistedCache,
	writeCacheIdentity,
} from "@/services/tanstack-query/cache-persistence"

/**
 * Centralized query keys for session-related queries.
 * Use these constants to ensure consistent cache invalidation.
 */
export const sessionKeys = {
	all: ["session"] as const,
}

/**
 * Query hook for fetching the current user session.
 *
 * Session is cached for 5 minutes before becoming stale.
 * Uses Better Auth client which automatically handles cookies.
 */
export const sessionOptions = queryOptions({
	queryKey: sessionKeys.all,
	queryFn: async () => {
		const result = await authClient.getSession()
		if (result.error) {
			return null
		}
		return result.data
	},
	staleTime: 5 * 60 * 1000, // 5 minutes
	retry: false,
})

/**
 * Mutation hook for signing out the current user.
 *
 * Purges every trace of the session's cached data, then redirects home.
 *
 * WC-1 / Risky Flow **RF1** — the order is normative: memory first
 * (`queryClient.clear()`), then disk (`purgePersistedCache()`), then navigate.
 * Clearing memory first stops the persister from re-writing a snapshot after
 * the delete; navigating last means a purge failure surfaces as a failed
 * sign-out rather than a silent hand-over of the previous user's data.
 */
export function useSignOutMutation() {
	const router = useRouter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			const result = await authClient.signOut()
			if (result.error) {
				throw new Error(result.error.message || "Failed to sign out")
			}
			// The purge lives in `mutationFn`, not `onSuccess`: a throw here is
			// unambiguously a failed mutation, so the error state and the toast
			// below actually fire. A throw from a success callback is not a
			// dependable error channel.
			queryClient.clear()
			await purgePersistedCache()
			writeCacheIdentity(null)

			return result
		},
		onSuccess: () => {
			router.push("/")
			router.refresh()
		},
		// A purge that throws leaves a readable snapshot on disk. Say so out
		// loud rather than navigating away as though sign-out were complete.
		onError: () => {
			toast.error("Sign-out could not clear this device's cached data. Please try again.", {
				id: "sign-out-error",
			})
		},
	})
}
