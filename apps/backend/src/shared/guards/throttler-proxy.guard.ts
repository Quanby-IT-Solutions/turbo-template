import { Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { IncomingHttpHeaders } from "http"
import { fromNodeHeaders } from "better-auth/node"

import { getAuth } from "@repo/auth"

/**
 * Proxy-aware rate-limiting guard.
 *
 * ## Why not `req.ips[0]`
 *
 * Express orders `req.ips` **upstream-most → downstream-most**, i.e. exactly as
 * the `X-Forwarded-For` header reads left-to-right. The leftmost entry is the
 * one furthest from us and therefore the one a client can write itself — keying
 * the throttler on it lets any caller mint a fresh rate-limit bucket per request
 * simply by varying a header, defeating the only abuse control on the mutation
 * endpoints.
 *
 * ## What this guard keys on
 *
 * Anonymous requests, and requests whose session does not verify, use the
 * **rightmost-untrusted** entry: the peer address our own trusted proxy hop
 * actually accepted the connection from. Express already truncates `req.ips`
 * according to `trust proxy` (set from `TRUST_PROXY` in bootstrap.ts), so the
 * last remaining element is that address; `req.ip` resolves to the same value
 * and is the fallback for direct (unproxied) connections.
 *
 * A verified signed-in request is counted under `user:<id>` instead. The web
 * app calls this process directly for server-rendered pages, so those calls
 * share one address. An address key would put every signed-in user in the same
 * bucket. The id comes from Better Auth `getSession`, the same check
 * `RbacGuard` uses — never from a raw cookie or header. The result is stored
 * on `request.session` (and `request.sessionResolved`) so `RbacGuard` reuses
 * it. The lookup happens once per request even when more than one named
 * throttler asks for a tracker. If that lookup throws, the address key is
 * used and this guard does not fail the request.
 *
 * ## Trust chain (Risky Flow RF2 — see DOMAIN-MODEL.md)
 *
 * The address key is only sound while both halves agree:
 *   1. `nginx.conf` **sets** (never appends) `X-Forwarded-For $remote_addr`, so
 *      the header carries exactly one, proxy-authored entry, and
 *   2. `TRUST_PROXY` equals the real number of hops in front of the app (1 for
 *      the shipped single-Nginx topology).
 *
 * Raising `TRUST_PROXY` above the real hop count re-opens the forgery: Express
 * would then keep client-supplied entries in `req.ips`. Any deployment that
 * fronts the backend with an extra proxy/LB must update both places together.
 * The user key does not read that header.
 */
interface ThrottleRequest {
	ip?: string
	ips?: string[]
	headers?: IncomingHttpHeaders
	session?: { user?: { id?: string } } | null
	user?: { id?: string } | null
	sessionResolved?: boolean
}

@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
	protected async getTracker(req: Record<string, unknown>): Promise<string> {
		const request = req as ThrottleRequest
		try {
			const userId = await this.resolveUserId(request)
			if (userId) {
				return `user:${userId}`
			}
		} catch {
			// A failed lookup must not fail the request. Count it by address.
		}
		return this.addressTracker(request)
	}

	/**
	 * Verified user id for this request, or undefined when there is no session.
	 * Reuses a session already stored on the request. Records `sessionResolved`
	 * after a definitive answer so a second tracker, and `RbacGuard`, do not
	 * look it up again. A thrown lookup is not recorded: the caller falls back
	 * to the address key, and a later guard may try again.
	 */
	private async resolveUserId(request: ThrottleRequest): Promise<string | undefined> {
		const existingId = request.session?.user?.id
		if (existingId) {
			return existingId
		}
		if (request.sessionResolved) {
			return undefined
		}

		const session = await getAuth().api.getSession({
			headers: fromNodeHeaders(request.headers ?? {}),
		})
		request.sessionResolved = true
		if (!session?.user?.id) {
			return undefined
		}

		request.session = session
		request.user = session.user
		return session.user.id
	}

	private addressTracker(request: ThrottleRequest): string {
		const ips = request.ips
		return ips?.[ips.length - 1] ?? (request.ip as string)
	}
}
