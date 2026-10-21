import { Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { IncomingHttpHeaders } from "http"

import { resolveRequestSession, type RequestWithSession } from "./resolve-request-session"

/**
 * Proxy-aware rate-limiting guard.
 *
 * ## Why not `req.ips[0]`
 *
 * Express orders `req.ips` **upstream-most → downstream-most**, i.e. exactly as
 * the `X-Forwarded-For` header reads left-to-right. The leftmost entry is the
 * one furthest from us and therefore the one a client can write itself — keying
 * the throttler on it lets any caller mint a fresh rate-limit bucket per request
 * simply by varying a header.
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
 * on `request.session` (and `request.sessionResolved`) so `RbacGuard` and
 * `SessionAuthGuard` reuse it. The lookup happens once per request even when
 * more than one named throttler asks for a tracker. If that lookup throws,
 * the address key is used and this guard does not fail the request.
 *
 * ## Trust chain (see DOMAIN-MODEL.md)
 *
 * `TRUST_PROXY` must equal the real hop count. The value stays `1` for one hop:
 *   1. Local / dev: nginx **sets** (never appends) `X-Forwarded-For $remote_addr`,
 *      so the header carries exactly one nginx-authored entry.
 *   2. Production: the load balancer **appends** the address it saw onto
 *      `X-Forwarded-For`. With one trusted hop, Express keeps that rightmost,
 *      load-balancer-authored entry. Staging is EC2 plus an Elastic IP, and
 *      host Nginx on the instance is the single trusted hop (TRUST_PROXY=1).
 *      Health is checked on the host over SSH.
 *
 * Raising `TRUST_PROXY` alone does not move this guard's address key, because
 * `getTracker` reads the rightmost `X-Forwarded-For` entry. An extra hop
 * needs `TRUST_PROXY` and `getTracker` updated together. The user key does
 * not read that header.
 */
interface ThrottleRequest extends RequestWithSession {
	ip?: string
	ips?: string[]
	headers?: IncomingHttpHeaders
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
	 * Uses the shared per-request lookup. A thrown lookup is not recorded: the
	 * caller falls back to the address key, and a later guard may try again.
	 */
	private async resolveUserId(request: ThrottleRequest): Promise<string | undefined> {
		const session = await resolveRequestSession(request)
		return session?.user?.id
	}

	private addressTracker(request: ThrottleRequest): string {
		const ips = request.ips
		return ips?.[ips.length - 1] ?? (request.ip as string)
	}
}
