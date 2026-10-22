import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RateLimitError } from "@/core/lib/rate-limit-utils"
import {
	resolveBetterFetchRateLimit,
	type AuthFetchArg,
} from "@/features/auth/api/better-fetch-rate-limit-mock"

const { verifyEmail, sendVerificationEmail } = vi.hoisted(() => ({
	verifyEmail: vi.fn(),
	sendVerificationEmail: vi.fn(),
}))

vi.mock("@/services/better-auth/auth-client", () => ({
	authClient: {
		verifyEmail: (input: AuthFetchArg) => verifyEmail(input),
		sendVerificationEmail: (input: AuthFetchArg) => sendVerificationEmail(input),
	},
}))

const { useResendVerificationMutation, useVerifyEmailMutation } =
	await import("./verify-email.hooks")

function renderMutations() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	})
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return {
		verify: renderHook(() => useVerifyEmailMutation(), { wrapper }),
		resend: renderHook(() => useResendVerificationMutation(), { wrapper }),
	}
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe("verify-email rate limit", () => {
	it("throws RateLimitError from verifyEmail when the error has no headers", async () => {
		verifyEmail.mockImplementation((input: AuthFetchArg) =>
			resolveBetterFetchRateLimit(input, "http://localhost:3000/api/v1/auth/verify-email")
		)

		const { verify } = renderMutations()
		verify.result.current.mutate({ token: "token" })

		await waitFor(() => expect(verify.result.current.isError).toBe(true))

		expect(verify.result.current.error).toBeInstanceOf(RateLimitError)
		expect((verify.result.current.error as RateLimitError).retryAfter).toBe(10)
		const returned = await verifyEmail.mock.results[0]?.value
		expect(returned.error).not.toHaveProperty("headers")
	})

	it("throws RateLimitError from sendVerificationEmail when the error has no headers", async () => {
		sendVerificationEmail.mockImplementation((input: AuthFetchArg) =>
			resolveBetterFetchRateLimit(
				input,
				"http://localhost:3000/api/v1/auth/send-verification-email"
			)
		)

		const { resend } = renderMutations()
		resend.result.current.mutate({ email: "a@example.com" })

		await waitFor(() => expect(resend.result.current.isError).toBe(true))

		expect(resend.result.current.error).toBeInstanceOf(RateLimitError)
		expect((resend.result.current.error as RateLimitError).retryAfter).toBe(10)
		const returned = await sendVerificationEmail.mock.results[0]?.value
		expect(returned.error).not.toHaveProperty("headers")
	})
})
