"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { CreateTodoInput, Todo } from "@repo/contracts"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}`

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		...init,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})

	if (!response.ok) {
		let message = `Request failed (${response.status})`
		try {
			const body = (await response.json()) as { message?: string; error?: { message?: string } }
			message = body?.message ?? body?.error?.message ?? message
		} catch {
			// ignore non-JSON error bodies
		}
		throw new Error(message)
	}

	if (response.status === 204) {
		return undefined as T
	}

	return (await response.json()) as T
}

export const todosKeys = {
	all: ["todos"] as const,
}

export function useTodosQuery() {
	return useQuery({
		queryKey: todosKeys.all,
		queryFn: () => apiFetch<Todo[]>("/example/todos"),
	})
}

export function useCreateTodoMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateTodoInput) =>
			apiFetch<Todo>("/example/todos", { method: "POST", body: JSON.stringify(payload) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
	})
}

export function useToggleTodoMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, title, completed }: { id: number; title: string; completed: boolean }) =>
			apiFetch<Todo>(`/example/todos/${id}`, {
				method: "PUT",
				body: JSON.stringify({ title, completed }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
	})
}

export function useDeleteTodoMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<{ success: boolean; id: number }>(`/example/todos/${id}`, { method: "DELETE" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
	})
}
