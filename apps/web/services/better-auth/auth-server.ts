import { cache } from "react"
import { unstable_rethrow } from "next/navigation"
import { type betterAuth } from "better-auth"

import { getCookieHeader } from "@/core/lib/cookie-utils"
import { getForwardedForHeader, getServerAuthUrl } from "@/core/lib/server-utils"

// `@repo/auth` re-exports this as `ReturnType<typeof getAuth>["$Infer"]["Session"]`.
// Importing it from that package loads `config.js`, which validates env at
// import time. Next 16.3 evaluates the page module while collecting page data,
// so the web app cannot import `@repo/auth` from a route.
type AuthSession = ReturnType<typeof betterAuth>["$Infer"]["Session"]

/**
 * The server-side session read did not succeed and did not prove signed-out.
 * Callers must not treat this as "no session".
 */
export class SessionUnavailableError extends Error {
	readonly status: number | null
	readonly retryAfter: string | null

	constructor(status: number | null, retryAfter: string | null) {
		super("Session read unavailable")
		this.name = "SessionUnavailableError"
		this.status = status
		this.retryAfter = retryAfter
	}
}

/**
 * Read the current session from the backend.
 *
 * A 2xx with a user is the session. A 2xx null body or a 401 is signed out.
 * Anything else, including a network failure, throws {@link SessionUnavailableError}.
 * There is no retry here.
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
	try {
		const cookieHeader = await getCookieHeader()
		const forwardedFor = await getForwardedForHeader()

		const response = await fetch(`${getServerAuthUrl()}/get-session`, {
			headers: {
				"Content-Type": "application/json",
				"cookie": cookieHeader,
				...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
			},
			cache: "no-store",
		})

		if (response.status === 401) {
			return null
		}

		if (!response.ok) {
			throw new SessionUnavailableError(response.status, response.headers.get("x-retry-after"))
		}

		const body = (await response.json()) as AuthSession | null
		return body ?? null
	} catch (error) {
		// A static render bails out by throwing. That is not a failed session read.
		unstable_rethrow(error)
		if (error instanceof SessionUnavailableError) throw error
		throw new SessionUnavailableError(null, null)
	}
})
