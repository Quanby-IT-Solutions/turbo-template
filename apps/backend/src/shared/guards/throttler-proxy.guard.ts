import { Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"

/**
 * Proxy-aware rate-limiting guard.
 *
 * When the app runs behind a reverse proxy (Nginx, ALB) and Express `trust proxy`
 * is enabled, the real client IP is exposed via `req.ips` (parsed from the
 * `X-Forwarded-For` header). This guard tracks callers by that forwarded IP,
 * falling back to `req.ip` for direct connections.
 */
@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
	protected async getTracker(req: Record<string, unknown>): Promise<string> {
		return (req.ips as string[])?.[0] ?? (req.ip as string)
	}
}
