// Test-only stand-in for @better-fetch/fetch 1.3.1's non-throwing error path.
// The returned error is the JSON body plus status and statusText. Response
// headers stay on `ctx.response` and are delivered only through `onError`.

export const BETTER_FETCH_RATE_LIMIT_ERROR = {
	status: 429,
	statusText: "Too Many Requests",
	message: "Too many requests. Please try again later.",
}

export type AuthFetchArg = {
	fetchOptions?: {
		onError?: (ctx: {
			response: Response
			responseText?: string
			request?: Request
			error?: typeof BETTER_FETCH_RATE_LIMIT_ERROR
		}) => Promise<void> | void
	}
}

export async function resolveBetterFetchRateLimit(input: AuthFetchArg | undefined, url: string) {
	const response = new Response(null, {
		status: 429,
		headers: { "X-Retry-After": "10" },
	})
	const error = { ...BETTER_FETCH_RATE_LIMIT_ERROR }

	await input?.fetchOptions?.onError?.({
		response,
		responseText: JSON.stringify({ message: error.message }),
		request: new Request(url),
		error,
	})

	return { data: null, error }
}
