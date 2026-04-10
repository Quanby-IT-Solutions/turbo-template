import "server-only"

import { cache } from "react"

import { env } from "@/env"

import { getApiUrl } from "./utils"

const DEFAULT_API_VERSION = "v1"

/**
 * Get the API URL for server-side fetches.
 *
 * Prefers the internal Docker network URL (INTERNAL_API_BASE_URL) for
 * fast, zero-latency requests that stay on the same machine.
 * Falls back to the public API URL for local development.
 */
export const getServerApiUrl = cache(() => {
	if (env.INTERNAL_API_BASE_URL) {
		const baseUrl = env.INTERNAL_API_BASE_URL.replace(/\/$/, "")
		const version = (env.NEXT_PUBLIC_API_VERSION || DEFAULT_API_VERSION).replace(/^\//, "")
		return `${baseUrl}/${version}`
	}
	return getApiUrl()
})

/**
 * Get the auth URL for server-side fetches.
 */
export const getServerAuthUrl = cache(() => {
	return `${getServerApiUrl()}/auth`
})
