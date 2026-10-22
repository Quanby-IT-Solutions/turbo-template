"use client"

import { useMutation } from "@tanstack/react-query"

import { createRetryAfterCapture, RateLimitError } from "@/core/lib/rate-limit-utils"
import { authClient } from "@/services/better-auth/auth-client"

import type { ForgotPassword } from "./forgot-password.schema"

export function useForgotPasswordMutation() {
	return useMutation({
		// Anti-enumeration: unknown emails still resolve into the neutral
		// confirmation so account existence never leaks. Only surface genuine
		// operational failures such as rate-limit (429) or server/transport
		// errors (>= 500) so broken reset-email delivery is not hidden.
		mutationFn: async ({ email }: ForgotPassword) => {
			const retryAfterCapture = createRetryAfterCapture()
			const result = await authClient.requestPasswordReset({
				email,
				redirectTo: "/reset-password",
				fetchOptions: retryAfterCapture.fetchOptions,
			})

			const status = result.error?.status

			// Rate limiting is the one outcome worth distinguishing: it tells the
			// user to wait rather than implying anything about the address.
			if (status === 429 && result.error) {
				throw new RateLimitError(retryAfterCapture.seconds(result.error))
			}

			// Every other outcome is reported identically, including when mail
			// delivery fails.
		},
	})
}
