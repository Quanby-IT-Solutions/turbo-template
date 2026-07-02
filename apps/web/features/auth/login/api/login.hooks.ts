"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { extractRetryAfterSeconds, RateLimitError } from "@/core/lib/rate-limit-utils"
import { authClient } from "@/services/better-auth/auth-client"
import { sessionKeys } from "@/features/auth/api/session.hooks"

import type { Login } from "./login.schema"

/**
 * Thrown when sign-in fails because the account's email is not yet verified.
 * Carries the attempted email so the form can offer to resend verification.
 */
export class UnverifiedEmailError extends Error {
	readonly email: string

	constructor(email: string, message = "Please verify your email before signing in.") {
		super(message)
		this.name = "UnverifiedEmailError"
		this.email = email
	}
}

function isUnverifiedEmailError(error: { message?: string; code?: string; status?: number }) {
	const code = error.code?.toUpperCase() ?? ""
	const message = error.message?.toLowerCase() ?? ""
	return (
		code === "EMAIL_NOT_VERIFIED" ||
		message.includes("not verified") ||
		message.includes("verify your email")
	)
}

export function useLoginMutation() {
	const router = useRouter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: Login) => {
			const result = await authClient.signIn.email(data)
			if (result.error) {
				if (isUnverifiedEmailError(result.error)) {
					throw new UnverifiedEmailError(data.email)
				}
				if (result.error.status === 429) {
					throw new RateLimitError(extractRetryAfterSeconds(result.error))
				}
				throw new Error(result.error.message || "Failed to sign in")
			}
			return result
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sessionKeys.all })
			router.push("/")
			router.refresh()
		},
	})
}
