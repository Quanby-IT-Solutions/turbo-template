"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { extractRetryAfterSeconds, RateLimitError } from "@/core/lib/rate-limit-utils"
import { authClient } from "@/services/better-auth/auth-client"

export function useResetPasswordMutation() {
	const router = useRouter()

	return useMutation({
		mutationFn: async ({ newPassword, token }: { newPassword: string; token: string }) => {
			const result = await authClient.resetPassword({ newPassword, token })
			if (result.error) {
				if (result.error.status === 429) {
					throw new RateLimitError(extractRetryAfterSeconds(result.error))
				}
				throw new Error(result.error.message || "Failed to reset password")
			}
			return result
		},
		onSuccess: () => {
			router.push("/login")
		},
	})
}
