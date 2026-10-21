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
 * simply by varying a header.
 *
 * ## What this guard keys on
 *
 * The **rightmost-untrusted** entry: the peer address our own trusted proxy hop
 * actually accepted the connection from. Express already truncates `req.ips`
 * according to `trust proxy` (set from `TRUST_PROXY` in bootstrap.ts), so the
 * last remaining element is that address; `req.ip` resolves to the same value
 * and is the fallback for direct (unproxied) connections.
 *
 * ## Trust chain (see DOMAIN-MODEL.md)
 *
 * `TRUST_PROXY` must equal the real hop count. The value stays `1` for one hop:
 *   1. Local / dev: nginx **sets** (never appends) `X-Forwarded-For $remote_addr`,
 *      so the header carries exactly one nginx-authored entry.
 *   2. Production: the load balancer **appends** the address it saw onto
 *      `X-Forwarded-For`. With one trusted hop, Express keeps that rightmost,
 *      load-balancer-authored entry. Staging in this repo is EC2 plus an
 *      Elastic IP; any load balancer there is managed outside this repo.
 *
 * Raising `TRUST_PROXY` alone does not move this guard's key, because
 * `getTracker` reads the rightmost `X-Forwarded-For` entry. An extra hop
 * needs `TRUST_PROXY` and `getTracker` updated together.
 */
@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
	protected async getTracker(req: Record<string, unknown>): Promise<string> {
		const ips = req.ips as string[] | undefined
		return ips?.[ips.length - 1] ?? (req.ip as string)
	}
}
