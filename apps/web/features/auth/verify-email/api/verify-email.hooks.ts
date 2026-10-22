"use client"

import { useMutation } from "@tanstack/react-query"

import { createRetryAfterCapture, RateLimitError } from "@/core/lib/rate-limit-utils"
import { authClient } from "@/services/better-auth/auth-client"

export function useVerifyEmailMutation() {
	return useMutation({
		mutationFn: async ({ token }: { token: string }) => {
			const retryAfterCapture = createRetryAfterCapture()
			const result = await authClient.verifyEmail({
				query: { token },
				fetchOptions: retryAfterCapture.fetchOptions,
			})
			if (result.error) {
				if (result.error.status === 429) {
					throw new RateLimitError(retryAfterCapture.seconds(result.error))
				}
				throw new Error(result.error.message || "Failed to verify email")
			}
			return result
		},
	})
}

export function useResendVerificationMutation() {
	return useMutation({
		mutationFn: async ({ email }: { email: string }) => {
			const retryAfterCapture = createRetryAfterCapture()
			const result = await authClient.sendVerificationEmail({
				email,
				fetchOptions: retryAfterCapture.fetchOptions,
			})

			// Anti-enumeration: account-state outcomes (already verified, unknown
			// email) must resolve into the neutral confirmation so verification
			// status never leaks. Only surface truly actionable operational
			// failures such as rate-limit (429) or server/transport errors (>= 500).
			const status = result.error?.status
			if (status === 429 && result.error) {
				throw new RateLimitError(retryAfterCapture.seconds(result.error))
			}
			if (status && status >= 500) {
				throw new Error(result.error?.message || "Failed to send verification email")
			}

			return result
		},
	})
}
