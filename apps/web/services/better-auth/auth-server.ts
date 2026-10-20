import { cache } from "react"
import { type betterAuth } from "better-auth"

import { getCookieHeader } from "@/core/lib/cookie-utils"
import { getServerAuthUrl } from "@/core/lib/server-utils"

// `@repo/auth` re-exports this as `ReturnType<typeof getAuth>["$Infer"]["Session"]`.
// Importing it from that package loads `config.js`, which validates env at
// import time. Next 16.3 evaluates the page module while collecting page data,
// so the web app cannot import `@repo/auth` from a route.
type AuthSession = ReturnType<typeof betterAuth>["$Infer"]["Session"]

/**
 * Get current user session from backend.
 *
 * Proxies request to backend's /get-session endpoint with cookie forwarding.
 * Returns session data if authenticated, null otherwise.
 *
 * @returns Promise<AuthSession | null> - The session data or null
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
	try {
		const cookieHeader = await getCookieHeader()

		const response = await fetch(`${getServerAuthUrl()}/get-session`, {
			headers: {
				"Content-Type": "application/json",
				"cookie": cookieHeader,
			},
			cache: "no-store",
		})

		if (!response.ok) {
			return null
		}

		return response.json()
	} catch {
		return null
	}
})
