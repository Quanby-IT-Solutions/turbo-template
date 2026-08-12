"use client"

import { useMutation } from "@tanstack/react-query"

import type { CreateTicketInput, Ticket } from "@repo/contracts"

import { ApiError } from "@/core/lib/api-error"
import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}`

/**
 * Submit a support ticket (HY-2 / F-62).
 *
 * Submission is deliberately open to anonymous callers — AZ-1 gates ticket
 * *reads* on `users:read`, not writes, because a support form nobody can reach
 * without an account is not a support form. `credentials: "include"` is still
 * sent so that a signed-in submitter gets `authorId` recorded server-side
 * (AZ-3); the client never sends an author itself.
 *
 * No cache invalidation on success: the submitter cannot read the ticket list
 * (that needs `users:read`), so there is no query of theirs to refresh.
 */
export function useSubmitTicketMutation() {
	return useMutation<Ticket, ApiError, CreateTicketInput>({
		mutationFn: async payload => {
			const response = await fetch(`${API_BASE}/tickets`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				let message = `Request failed (${response.status})`
				try {
					const body = (await response.json()) as {
						message?: string
						error?: { message?: string }
					}
					message = body?.message ?? body?.error?.message ?? message
				} catch {
					// ignore non-JSON error bodies
				}
				throw new ApiError(response.status, message)
			}

			return (await response.json()) as Ticket
		},
	})
}
