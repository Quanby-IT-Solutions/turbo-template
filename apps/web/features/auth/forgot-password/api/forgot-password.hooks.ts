"use client"

import { useMutation } from "@tanstack/react-query"

import { extractRetryAfterSeconds, RateLimitError } from "@/core/lib/rate-limit-utils"
import { authClient } from "@/services/better-auth/auth-client"

import type { ForgotPassword } from "./forgot-password.schema"

export function useForgotPasswordMutation() {
	return useMutation({
		// Anti-enumeration: unknown emails still resolve into the neutral
		// confirmation so account existence never leaks. Only surface genuine
		// operational failures such as rate-limit (429) or server/transport
		// errors (>= 500) so broken reset-email delivery is not hidden.
		mutationFn: async ({ email }: ForgotPassword) => {
			const result = await authClient.requestPasswordReset({
				email,
				redirectTo: "/reset-password",
			})

			const status = result.error?.status
			if (status === 429 && result.error) {
				throw new RateLimitError(extractRetryAfterSeconds(result.error))
			}
			if (status && status >= 500) {
				throw new Error(result.error?.message || "Failed to send reset email")
			}
		},
	})
}
