/**
 * What the service worker must never cache or fake (WC-2 / F-20, F-48).
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
 * Excludes authenticated routes (F-48) and token-bearing links: the offline
 * shell cannot consume a token, so showing it strands the user on a link they
 * cannot retry.
 */
export function mayServeOfflineFallback(url: URL): boolean {
	return !isAuthenticatedRoute(url) && !carriesToken(url)
}
