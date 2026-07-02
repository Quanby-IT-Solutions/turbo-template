"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { extractRetryAfterSeconds, RateLimitError } from "@/core/lib/rate-limit-utils"
import { authClient } from "@/services/better-auth/auth-client"
import { sessionKeys } from "@/features/auth/api/session.hooks"

import type { Register } from "./register.schema"

export function useRegisterMutation() {
	const router = useRouter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: Register) => {
			const result = await authClient.signUp.email(data)
			if (result.error) {
				if (result.error.status === 429) {
					throw new RateLimitError(extractRetryAfterSeconds(result.error))
				}
				throw new Error(result.error.message || "Failed to sign up")
			}
			// When email verification enforcement is on, Better Auth returns a user
			// but no session token — the user must verify before signing in.
			const requiresVerification = !result.data?.token
			return { requiresVerification, email: data.email }
		},
		onSuccess: ({ requiresVerification }) => {
			queryClient.invalidateQueries({ queryKey: sessionKeys.all })
			if (!requiresVerification) {
				router.push("/")
				router.refresh()
			}
		},
	})
}
