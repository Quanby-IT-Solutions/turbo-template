/**
 * The same-origin `/ingest` proxy to PostHog (`app/ingest/[...path]/route.ts`).
 *
 * A route handler rather than a `next.config.ts` rewrite: a rewrite to an
 * external host forwards the browser's request headers, and behind the
 * single-origin Nginx proxy those include the Better Auth session cookie. This
 * builds a fresh request instead, with only what PostHog needs, and strips any
 * cookie PostHog tries to set on the app's origin.
 */

export type PosthogHosts = { ingest: string; assets: string }

/** Only PostHog Cloud over https. Self-hosting PostHog is out of scope. */
const POSTHOG_CLOUD_HOST = /^[a-z0-9-]+\.i\.posthog\.com$/

/**
 * The PostHog origins the proxy may talk to, or `undefined` when browser
 * analytics is off or the configured host is not an https PostHog Cloud host.
 * Same gate as `core/lib/posthog-config.ts`: the flag AND a token.
 */
export function resolvePosthogHosts(config: {
	enabled: boolean | undefined
	token: string | undefined
	host: string | undefined
}): PosthogHosts | undefined {
	if (!config.enabled || !config.token?.trim()) return undefined

	let url: URL
	try {
		url = new URL(config.host?.trim() || "https://us.i.posthog.com")
	} catch {
		return undefined
	}
	if (url.protocol !== "https:" || !POSTHOG_CLOUD_HOST.test(url.hostname)) return undefined

	const region = url.hostname.split(".")[0]
	return { ingest: url.origin, assets: `https://${region}-assets.i.posthog.com` }
}

/** Request headers PostHog needs. Everything else, cookies included, stays home. */
const FORWARDED_REQUEST_HEADERS = ["content-type", "content-encoding", "user-agent"] as const

/**
 * The upstream request for one proxied call.
 *
 * The visitor's address goes on as `x-forwarded-for` so PostHog's GeoIP sees
 * the visitor rather than this server; the project discards the IP itself
 * after the lookup ("Discard client IP data").
 */
export async function buildUpstreamRequest(
	incoming: Request,
	hosts: PosthogHosts
): Promise<{ url: string; init: RequestInit }> {
	const { pathname, search } = new URL(incoming.url)
	const path = pathname.replace(/^\/ingest/, "")
	const origin = path.startsWith("/static/") ? hosts.assets : hosts.ingest

	const headers = new Headers()
	for (const name of FORWARDED_REQUEST_HEADERS) {
		const value = incoming.headers.get(name)
		if (value) headers.set(name, value)
	}
	const forwardedFor = incoming.headers.get("x-forwarded-for") ?? incoming.headers.get("x-real-ip")
	if (forwardedFor) headers.set("x-forwarded-for", forwardedFor)

	const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD"
	return {
		url: `${origin}${path}${search}`,
		init: {
			method: incoming.method,
			headers,
			body: hasBody ? await incoming.arrayBuffer() : undefined,
			redirect: "manual",
		},
	}
}

/** PostHog's response for the browser, minus anything that could set a cookie on the app's origin. */
export function cleanUpstreamResponse(upstream: Response): Response {
	const headers = new Headers(upstream.headers)
	headers.delete("set-cookie")
	// The body is handed over already decoded; the length and encoding no longer apply.
	headers.delete("content-encoding")
	headers.delete("content-length")

	return new Response(upstream.body, { status: upstream.status, headers })
}
