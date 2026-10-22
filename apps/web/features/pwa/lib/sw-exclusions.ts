/**
 * What the service worker must never cache or fake.
 *
 * Lives outside `sw.ts` so the rules are unit-testable and defined in exactly
 * one place — `sw.ts` imports them rather than restating them, and a new
 * token-bearing route is added here alone.
 */

/**
 * Query parameters that carry a single-use credential.
 *
 * Enumerated from the auth flows that mint them (email verification, password
 * reset). Matched by parameter NAME, not by path: a path list silently stops
 * covering a route the moment someone adds one, whereas the token is the thing
 * that matters wherever it appears.
 */
export const TOKEN_PARAMS = ["token", "code", "otp", "secret"] as const

/** True when a URL carries a credential that must never reach a cache. */
export function carriesToken(url: URL): boolean {
	return TOKEN_PARAMS.some(param => url.searchParams.has(param))
}

/**
 * Route groups that require a session.
 *
 * Serving the generic offline page for these masks auth state: a signed-out
 * visitor gets a plausible app shell instead of being sent to sign in, and a
 * signed-in user cannot tell "offline" from "logged out".
 */
export const AUTHENTICATED_ROUTES = [
	"/dashboard",
	"/account",
	"/user-management",
	"/todos",
	"/submit-ticket",
	"/session",
] as const

export function isAuthenticatedRoute(url: URL): boolean {
	return AUTHENTICATED_ROUTES.some(
		route => url.pathname === route || url.pathname.startsWith(`${route}/`)
	)
}

/**
 * Whether the offline fallback page may stand in for this navigation.
 *
 * Excludes authenticated routes and token-bearing links: the offline
 * shell cannot consume a token, so showing it strands the user on a link they
 * cannot retry.
 */
export function mayServeOfflineFallback(url: URL): boolean {
	return !isAuthenticatedRoute(url) && !carriesToken(url)
}

/**
 * Same-origin API surface the worker must not handle.
 *
 * Exact `/api` or `/api/...`. A bare prefix of `/api` would also match a page
 * such as `/apiary`.
 */
export function isApiPath(url: URL): boolean {
	return url.pathname === "/api" || url.pathname.startsWith("/api/")
}

/**
 * Requests the service worker must not intercept.
 *
 * Cross-origin fetches (the health probe hits the API on another origin under
 * local `next start`) and same-origin `/api` traffic go straight to the
 * network. Re-fetching them inside the worker can fail the page's own fetch
 * even when the API answered, which flips the app offline.
 *
 * `workerOrigin` is `self.location.origin` inside the worker — the web origin
 * — rather than an env value baked in at worker build time.
 */
export function bypassesServiceWorker(url: URL, workerOrigin: string): boolean {
	return url.origin !== workerOrigin || isApiPath(url)
}
