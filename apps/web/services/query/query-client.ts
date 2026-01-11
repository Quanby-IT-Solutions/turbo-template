"use client"

import { QueryClient } from "@tanstack/react-query"

/**
 * TanStack Query client configuration
 * Used for data fetching and caching
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			refetchOnWindowFocus: false,
			retry: 1,
		},
		mutations: {
			retry: 1,
		},
	},
})
