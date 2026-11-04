import { proxyToPosthog, resolvePosthogHosts } from "@/core/lib/posthog-proxy"
import { env } from "@/env"

/**
 * Same-origin proxy for the browser PostHog SDK (`api_host: "/ingest"`).
 *
 * Keeps `connect-src 'self'` sufficient and ad blockers out of the way, while
 * never forwarding the visitor's cookies or credentials (see
 * `core/lib/posthog-proxy.ts` for why this is not a rewrite). With browser
 * analytics off, or a host that is not https PostHog Cloud, every path is 404
 * and nothing leaves the server.
 */
const hosts = resolvePosthogHosts({
	enabled: env.NEXT_PUBLIC_POSTHOG_ENABLED,
	token: env.NEXT_PUBLIC_POSTHOG_TOKEN,
	host: env.NEXT_PUBLIC_POSTHOG_HOST,
})

export const dynamic = "force-dynamic"

async function proxy(request: Request): Promise<Response> {
	if (!hosts) return new Response(null, { status: 404 })
	return proxyToPosthog(request, hosts)
}

export const GET = proxy
export const POST = proxy
