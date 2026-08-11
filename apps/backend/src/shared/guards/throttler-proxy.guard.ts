import { Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"

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
 * The **rightmost-untrusted** entry: the peer address our own trusted proxy hop
 * actually accepted the connection from. Express already truncates `req.ips`
 * according to `trust proxy` (set from `TRUST_PROXY` in bootstrap.ts), so the
 * last remaining element is that address; `req.ip` resolves to the same value
 * and is the fallback for direct (unproxied) connections.
 *
 * ## Trust chain (Risky Flow RF2 — see DOMAIN-MODEL.md)
 *
 * This is only sound while both halves agree:
 *   1. `nginx.conf` **sets** (never appends) `X-Forwarded-For $remote_addr`, so
 *      the header carries exactly one, proxy-authored entry, and
 *   2. `TRUST_PROXY` equals the real number of hops in front of the app (1 for
 *      the shipped single-Nginx topology).
 *
 * Raising `TRUST_PROXY` above the real hop count re-opens the forgery: Express
 * would then keep client-supplied entries in `req.ips`. Any deployment that
 * fronts the backend with an extra proxy/LB must update both places together.
 */
@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
	protected async getTracker(req: Record<string, unknown>): Promise<string> {
		const ips = req.ips as string[] | undefined
		return ips?.[ips.length - 1] ?? (req.ip as string)
	}
}
