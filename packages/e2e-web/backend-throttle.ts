/**
 * E2E-only ceiling for the backend's default request limiter.
 *
 * Production defaults stay 100 requests per 60000 ms. CI, the README, and
 * `assertE2eBackendThrottle` must use these same numbers. The guard key is
 * unchanged, so every local run still shares one address; the higher ceiling
 * is what keeps repeated runs off that bucket.
 */
export const E2E_THROTTLE_LIMIT = 5000
export const E2E_THROTTLE_TTL_MS = 60_000

export class E2eBackendThrottleError extends Error {
	constructor(detail: string) {
		super(
			`${detail} Start the backend with THROTTLE_LIMIT=${E2E_THROTTLE_LIMIT} THROTTLE_TTL=${E2E_THROTTLE_TTL_MS} and leave that process up. Do not change the code defaults.`
		)
		this.name = "E2eBackendThrottleError"
	}
}

/** `/me/permissions` on the API the auth URL points at. */
export function permissionsUrl(authApi: string): string {
	const base = authApi.endsWith("/") ? authApi : `${authApi}/`
	return new URL("../me/permissions", base).href
}

/**
 * The run's backend must be advertising the e2e limiter.
 * `x-ratelimit-limit` is the configured ceiling. A 401 is fine: the guard
 * runs before auth, and this does not need a session.
 */
export async function assertE2eBackendThrottle(
	authApi = process.env.E2E_AUTH_API_URL
): Promise<void> {
	if (!authApi) return

	const url = permissionsUrl(authApi)
	let response: Response
	try {
		response = await fetch(url, { headers: { accept: "application/json" } })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new E2eBackendThrottleError(`Could not reach ${url} (${message}).`)
	}

	const limit = response.headers.get("x-ratelimit-limit")
	if (limit !== String(E2E_THROTTLE_LIMIT)) {
		throw new E2eBackendThrottleError(
			`Backend default limiter advertised ${limit ?? "no x-ratelimit-limit header"}, expected ${E2E_THROTTLE_LIMIT}.`
		)
	}
}
