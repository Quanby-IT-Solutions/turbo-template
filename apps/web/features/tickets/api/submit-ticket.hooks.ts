"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useTicketsQuery() {
	return useQuery(
		orpc.ticket.list.queryOptions({
			staleTime: 60 * 1000,
		})
	)
}

export function useSubmitTicketMutation() {
	const queryClient = useQueryClient()

	return useMutation(
		orpc.ticket.submit.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.ticket.key() })
			},
		})
	)
}
