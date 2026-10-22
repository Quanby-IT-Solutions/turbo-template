import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RateLimitError } from "@/core/lib/rate-limit-utils"
import {
	resolveBetterFetchRateLimit,
	type AuthFetchArg,
} from "@/features/auth/api/better-fetch-rate-limit-mock"

const { signUpEmail } = vi.hoisted(() => ({ signUpEmail: vi.fn() }))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/services/better-auth/auth-client", () => ({
	authClient: {
		signUp: { email: (input: AuthFetchArg) => signUpEmail(input) },
	},
}))

const { useRegisterMutation } = await import("./register.hooks")

function renderRegister() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	})
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return renderHook(() => useRegisterMutation(), { wrapper })
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe("useRegisterMutation rate limit", () => {
	it("throws RateLimitError with the captured X-Retry-After when the error has no headers", async () => {
		signUpEmail.mockImplementation((input: AuthFetchArg) =>
			resolveBetterFetchRateLimit(input, "http://localhost:3000/api/v1/auth/sign-up/email")
		)

		const { result } = renderRegister()
		result.current.mutate({ name: "Ada", email: "a@example.com", password: "secret12" })

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(result.current.error).toBeInstanceOf(RateLimitError)
		expect((result.current.error as RateLimitError).retryAfter).toBe(10)
		const returned = await signUpEmail.mock.results[0]?.value
		expect(returned.error).not.toHaveProperty("headers")
	})
})
