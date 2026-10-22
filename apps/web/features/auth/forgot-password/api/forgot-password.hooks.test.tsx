import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RateLimitError } from "@/core/lib/rate-limit-utils"
import {
	resolveBetterFetchRateLimit,
	type AuthFetchArg,
} from "@/features/auth/api/better-fetch-rate-limit-mock"

const { requestPasswordReset } = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }))

vi.mock("@/services/better-auth/auth-client", () => ({
	authClient: {
		requestPasswordReset: (input: AuthFetchArg) => requestPasswordReset(input),
	},
}))

const { useForgotPasswordMutation } = await import("./forgot-password.hooks")

function renderForgotPassword() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	})
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return renderHook(() => useForgotPasswordMutation(), { wrapper })
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe("useForgotPasswordMutation rate limit", () => {
	it("throws RateLimitError with the captured X-Retry-After when the error has no headers", async () => {
		requestPasswordReset.mockImplementation((input: AuthFetchArg) =>
			resolveBetterFetchRateLimit(input, "http://localhost:3000/api/v1/auth/request-password-reset")
		)

		const { result } = renderForgotPassword()
		result.current.mutate({ email: "a@example.com" })

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeInstanceOf(RateLimitError)
		expect((result.current.error as RateLimitError).retryAfter).toBe(10)
		const returned = await requestPasswordReset.mock.results[0]?.value
		expect(returned.error).not.toHaveProperty("headers")
	})
})
