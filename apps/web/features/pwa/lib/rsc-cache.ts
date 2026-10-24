/**
 * What may be written to the RSC page-data caches.
 *
 * Lives outside `sw.ts` so the rules are unit-testable. `sw.ts` wires them
 * ahead of `defaultCache`. The installed `@serwist/turbopack` worker builds
 * those RSC handlers up front and gives them no `cacheWillUpdate`, so there
 * is no public hook to extend the entries in place.
 */

/**
 * Cache names and expiration used by the RSC routes in
 * `@serwist/turbopack` `defaultCache`. `maxAgeFrom` is left unset, which is
 * that plugin's default (`last-fetched`).
 */
export const RSC_RUNTIME_CACHE = {
	prefetch: "pages-rsc-prefetch",
	page: "pages-rsc",
} as const

export const RSC_EXPIRATION = {
	maxEntries: 32,
	maxAgeSeconds: 24 * 60 * 60,
} as const

/**
 * A flight error row is `E{` at the start of the body, or `<hex id>:E{`
 * at the start of a line. Text that merely contains that sequence is
 * ordinary page data.
 */
const FLIGHT_ERROR_ROW = /(?:^E\{|(?:^|\n)[0-9a-fA-F]+:E\{)/

export function isFlightErrorPayload(body: string): boolean {
	return FLIGHT_ERROR_ROW.test(body)
}

interface RscMatch {
	request: { headers: { get(name: string): string | null } }
	url: { pathname: string }
	sameOrigin: boolean
}

/**
 * Same-origin prefetch flight. Mirrors the prefetch RSC route: `RSC: 1`,
 * `Next-Router-Prefetch: 1`, and not under `/api/`.
 */
export function isRscPrefetchRequest({ request, url, sameOrigin }: RscMatch): boolean {
	return (
		request.headers.get("RSC") === "1" &&
		request.headers.get("Next-Router-Prefetch") === "1" &&
		sameOrigin &&
		!url.pathname.startsWith("/api/")
	)
}

/**
 * Same-origin flight, including a prefetch. Register the prefetch route
 * first so a prefetch is stored under its own cache name.
 */
export function isRscRequest({ request, url, sameOrigin }: RscMatch): boolean {
	return request.headers.get("RSC") === "1" && sameOrigin && !url.pathname.startsWith("/api/")
}

/**
 * `cacheWillUpdate` for an RSC route.
 *
 * A non-200 response and an error flight are not stored. The body is read
 * from a clone. A read failure is treated as not cacheable. The caller
 * schedules this after the network response has already been returned.
 */
export async function rscCacheWillUpdate({
	response,
}: {
	response: Response
}): Promise<Response | null> {
	if (response.status !== 200) return null

	try {
		const body = await response.clone().text()
		if (isFlightErrorPayload(body)) return null
	} catch {
		return null
	}

	return response
}
