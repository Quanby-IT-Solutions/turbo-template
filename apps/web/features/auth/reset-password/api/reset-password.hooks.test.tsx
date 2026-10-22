import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RateLimitError } from "@/core/lib/rate-limit-utils"
import {
	resolveBetterFetchRateLimit,
	type AuthFetchArg,
} from "@/features/auth/api/better-fetch-rate-limit-mock"

const { resetPassword } = vi.hoisted(() => ({ resetPassword: vi.fn() }))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/services/better-auth/auth-client", () => ({
	authClient: {
		resetPassword: (input: AuthFetchArg) => resetPassword(input),
	},
}))

const { useResetPasswordMutation } = await import("./reset-password.hooks")

function renderResetPassword() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	})
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return renderHook(() => useResetPasswordMutation(), { wrapper })
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe("useResetPasswordMutation rate limit", () => {
	it("throws RateLimitError with the captured X-Retry-After when the error has no headers", async () => {
		resetPassword.mockImplementation((input: AuthFetchArg) =>
			resolveBetterFetchRateLimit(input, "http://localhost:3000/api/v1/auth/reset-password")
		)

		const { result } = renderResetPassword()
		result.current.mutate({ newPassword: "secret12", token: "token" })

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeInstanceOf(RateLimitError)
		expect((result.current.error as RateLimitError).retryAfter).toBe(10)
		const returned = await resetPassword.mock.results[0]?.value
		expect(returned.error).not.toHaveProperty("headers")
	})
})
