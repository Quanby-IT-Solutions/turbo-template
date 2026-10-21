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
 */
export interface RequestWithSession {
	headers?: IncomingHttpHeaders
	session?: RequestSession | null
	user?: RequestSessionUser | null
}

/**
 * Verified answer for a request object. Not exported: only this helper reads
 * or writes it, and the entry is dropped with the request.
 */
const resolved = new WeakMap<object, RequestSession | null>()

/**
 * Resolve the verified session for this request, at most once.
 *
 * On a hit, the stored value is returned and `request.session` /
 * `request.user` are re-assigned from it. On a miss, `getSession` is called
 * once, the result (including null) is stored, both fields are set, and that
 * result is returned. A thrown lookup is not stored, so a later guard can try
 * again.
 */
export async function resolveRequestSession(
	request: RequestWithSession
): Promise<RequestSession | null> {
	if (resolved.has(request)) {
		const session = resolved.get(request) ?? null
		request.session = session
		request.user = session?.user ?? null
		return session
	}

	const session = (await getAuth().api.getSession({
		headers: fromNodeHeaders(request.headers ?? {}),
	})) as RequestSession | null

	const stored = session ?? null
	resolved.set(request, stored)
	request.session = stored
	request.user = stored?.user ?? null
	return stored
}
