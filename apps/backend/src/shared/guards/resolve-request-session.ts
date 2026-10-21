import type { IncomingHttpHeaders } from "http"
import { fromNodeHeaders } from "better-auth/node"

import { getAuth } from "@repo/auth"

/**
 * User attached to a request after a verified session lookup.
 * `role` is read by the same role checks the library auth guard performs.
 */
export interface RequestSessionUser {
	id?: string
	role?: string | string[]
}

/** Session stored on the request for later guards and `@Session()`. */
export interface RequestSession {
	user?: RequestSessionUser
	session?: { activeOrganizationId?: string }
}

/**
 * Request fields shared by the throttler, the permission guard and the auth guard.
 * `sessionResolved` is the definitive answer for this request, including
 * "looked up, and there is no session".
 */
export interface RequestWithSession {
	headers?: IncomingHttpHeaders
	session?: RequestSession | null
	user?: RequestSessionUser | null
	sessionResolved?: boolean
}

/**
 * Resolve the verified session for this request, at most once.
 *
 * A previous guard may already have stored the answer. When `sessionResolved`
 * is set, that stored session is returned — including a null session — and
 * `getSession` is not called again. A thrown lookup is not recorded, so a
 * later guard can try again.
 */
export async function resolveRequestSession(
	request: RequestWithSession
): Promise<RequestSession | null> {
	if (request.sessionResolved) {
		const session = request.session ?? null
		request.session = session
		request.user = session?.user ?? null
		return session
	}

	if (request.session?.user?.id) {
		request.sessionResolved = true
		request.user = request.session.user
		return request.session
	}

	const session = (await getAuth().api.getSession({
		headers: fromNodeHeaders(request.headers ?? {}),
	})) as RequestSession | null

	request.sessionResolved = true
	request.session = session ?? null
	request.user = session?.user ?? null
	return session ?? null
}
