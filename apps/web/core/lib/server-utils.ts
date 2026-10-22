import "server-only"

import { cache } from "react"
import { headers } from "next/headers"

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

/**
 * Inbound `x-forwarded-for` for server-side calls to the API.
 *
 * Returns the header exactly as this request received it, or nothing when
 * it is absent. On those calls the web process is the trusted hop in front
 * of the backend (see DOMAIN-MODEL.md): Express keeps the rightmost entry.
 */
export async function getForwardedForHeader(): Promise<string | undefined> {
	const headerList = await headers()
	const value = headerList.get("x-forwarded-for")
	if (value === null || value.length === 0) {
		return undefined
	}
	return value
}
