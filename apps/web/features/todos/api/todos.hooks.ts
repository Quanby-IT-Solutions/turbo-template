"use client"

import {
	useMutation,
	useMutationState,
	useQuery,
	type MutateOptions,
	type QueryClient,
} from "@tanstack/react-query"

import type { Todo } from "@repo/contracts"

import { ApiError } from "@/core/lib/api-error"
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
		const retryAfterHeader =
			response.headers.get("retry-after") ?? response.headers.get("x-retry-after")
		const parsedRetryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN
		const retryAfter = Number.isNaN(parsedRetryAfter) ? undefined : parsedRetryAfter
		throw new ApiError(response.status, message, retryAfter)
	}

	if (response.status === 204) {
		return undefined as T
	}

	return (await response.json()) as T
}

// Co-located UI-facing todo type. `id` is a `number` for server-persisted rows
// and an `"optimistic-<uuid>"` string for pending optimistic creates that have
// not yet received a server-assigned id.
export type TodoUi = {
	id: number | string
	title: string
	completed: boolean
	authorId: string
	createdAt: Date
	updatedAt: Date
}

type CreateTodoVars = { title: string; completed: boolean; idempotencyKey: string }
type UpdateTodoVars = { id: number; title: string; completed: boolean; idempotencyKey: string }
type DeleteTodoVars = { id: number; idempotencyKey: string }

export const todosKeys = {
	all: ["todos"] as const,
}

// Auth failures should not be retried — replaying a paused mutation after a
// 401/403 will never succeed without re-authentication. Classify by HTTP status
// (retained on ApiError) rather than message text, which apiFetch overwrites
// with the backend JSON message when one is present.
export function isAuthError(error: unknown): boolean {
	return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

function retryUnlessAuth(failureCount: number, error: unknown): boolean {
	if (isAuthError(error)) return false
	return failureCount < 3
}

// Shared rollback context. `hadSnapshot` distinguishes "no cached list existed"
// from "the cached list was an empty array" — both of which are otherwise
// indistinguishable from a truthiness check and would skip rollback.
type TodoMutationContext = { hadSnapshot: boolean; snapshot: TodoUi[] | undefined }

// Rolls back the optimistic cache on failure. The 429 rate-limit UX (live
// countdown toast + disabling the triggering control) is driven by the consuming
// components via `useRateLimitToast`, which reads each mutation's own error.
function handleTodoMutationError(queryClient: QueryClient, _error: unknown, context: unknown) {
	rollbackTodos(queryClient, context)
}

function rollbackTodos(queryClient: QueryClient, context: unknown) {
	const ctx = context as TodoMutationContext | undefined
	if (!ctx) return
	if (ctx.hadSnapshot) {
		// Restore the exact prior cache, even when it was `[]`.
		queryClient.setQueryData(todosKeys.all, ctx.snapshot)
	} else {
		// No snapshot existed; drop any optimistic additions to leave an empty list.
		queryClient.setQueryData<TodoUi[]>(todosKeys.all, [])
	}
}

/**
 * Registers rehydratable mutation defaults for the three todo mutations.
 *
 * Mutation defaults (mutationFn, onMutate, onError, onSettled, retry) are NOT
 * persisted by the query client — only the mutation variables are. After a
 * reload, paused mutations rehydrate without their functions, so this must be
 * called before `resumePausedMutations()` to restore behavior. It is safe to
 * call repeatedly (setMutationDefaults is synchronous and idempotent).
 */
export function registerTodosMutationDefaults(queryClient: QueryClient) {
	queryClient.setMutationDefaults(["todos", "create"], {
		mutationFn: ({ title, completed, idempotencyKey }: CreateTodoVars) =>
			apiFetch<Todo>("/example/todos", {
				method: "POST",
				body: JSON.stringify({ title, completed }),
				headers: { "Idempotency-Key": idempotencyKey },
			}),
		onMutate: async ({ title, completed, idempotencyKey }: CreateTodoVars) => {
			await queryClient.cancelQueries({ queryKey: todosKeys.all })
			const snapshot = queryClient.getQueryData<TodoUi[]>(todosKeys.all)
			const now = new Date()
			const optimistic: TodoUi = {
				id: `optimistic-${idempotencyKey}`,
				title,
				completed,
				authorId: "",
				createdAt: now,
				updatedAt: now,
			}
			queryClient.setQueryData<TodoUi[]>(todosKeys.all, prev => [...(prev ?? []), optimistic])
			return { hadSnapshot: snapshot !== undefined, snapshot } satisfies TodoMutationContext
		},
		onError: (error, _vars, context) => handleTodoMutationError(queryClient, error, context),
		onSettled: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
		retry: retryUnlessAuth,
	})

	queryClient.setMutationDefaults(["todos", "update"], {
		mutationFn: ({ id, title, completed, idempotencyKey }: UpdateTodoVars) => {
			if (typeof id !== "number") throw new Error("Cannot update optimistic todo")
			return apiFetch<Todo>(`/example/todos/${id}`, {
				method: "PUT",
				body: JSON.stringify({ title, completed }),
				headers: { "Idempotency-Key": idempotencyKey },
			})
		},
		onMutate: async ({ id, title, completed }: UpdateTodoVars) => {
			await queryClient.cancelQueries({ queryKey: todosKeys.all })
			const snapshot = queryClient.getQueryData<TodoUi[]>(todosKeys.all)
			queryClient.setQueryData<TodoUi[]>(todosKeys.all, prev =>
				(prev ?? []).map(todo =>
					todo.id === id ? { ...todo, title, completed, updatedAt: new Date() } : todo
				)
			)
			return { hadSnapshot: snapshot !== undefined, snapshot } satisfies TodoMutationContext
		},
		onError: (error, _vars, context) => handleTodoMutationError(queryClient, error, context),
		onSettled: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
		retry: retryUnlessAuth,
	})

	queryClient.setMutationDefaults(["todos", "delete"], {
		mutationFn: ({ id, idempotencyKey }: DeleteTodoVars) => {
			if (typeof id !== "number") throw new Error("Cannot delete optimistic todo")
			return apiFetch<{ success: boolean; id: number }>(`/example/todos/${id}`, {
				method: "DELETE",
				headers: { "Idempotency-Key": idempotencyKey },
			})
		},
		onMutate: async ({ id }: DeleteTodoVars) => {
			await queryClient.cancelQueries({ queryKey: todosKeys.all })
			const snapshot = queryClient.getQueryData<TodoUi[]>(todosKeys.all)
			queryClient.setQueryData<TodoUi[]>(todosKeys.all, prev =>
				(prev ?? []).filter(todo => todo.id !== id)
			)
			return { hadSnapshot: snapshot !== undefined, snapshot } satisfies TodoMutationContext
		},
		onError: (error, _vars, context) => handleTodoMutationError(queryClient, error, context),
		onSettled: () => queryClient.invalidateQueries({ queryKey: todosKeys.all }),
		retry: retryUnlessAuth,
	})
}

export function useTodosQuery() {
	return useQuery({
		queryKey: todosKeys.all,
		queryFn: () => apiFetch<TodoUi[]>("/example/todos"),
	})
}

export function useCreateTodoMutation() {
	const mutation = useMutation<Todo, Error, CreateTodoVars>({
		mutationKey: ["todos", "create"],
	})

	return {
		...mutation,
		mutate: (
			payload: { title: string; completed: boolean },
			options?: MutateOptions<Todo, Error, CreateTodoVars>
		) => mutation.mutate({ ...payload, idempotencyKey: crypto.randomUUID() }, options),
	}
}

export function useToggleTodoMutation() {
	const mutation = useMutation<Todo, Error, UpdateTodoVars>({
		mutationKey: ["todos", "update"],
	})

	return {
		...mutation,
		mutate: (
			vars: { id: number | string; title: string; completed: boolean },
			options?: MutateOptions<Todo, Error, UpdateTodoVars>
		) => {
			if (typeof vars.id !== "number") return // skip optimistic rows without a server id
			mutation.mutate({ ...vars, id: vars.id, idempotencyKey: crypto.randomUUID() }, options)
		},
	}
}

export function useDeleteTodoMutation() {
	const mutation = useMutation<{ success: boolean; id: number }, Error, DeleteTodoVars>({
		mutationKey: ["todos", "delete"],
	})

	return {
		...mutation,
		mutate: (
			id: number | string,
			options?: MutateOptions<{ success: boolean; id: number }, Error, DeleteTodoVars>
		) => {
			if (typeof id !== "number") return // skip optimistic rows without a server id
			mutation.mutate({ id, idempotencyKey: crypto.randomUUID() }, options)
		},
	}
}

// Surfaces errors from ALL todo mutations in the mutation cache — including
// mutations resumed from persisted/paused state by `resumePausedMutations()`,
// which are not attached to any per-hook `useMutation` observer. Subscribes via
// `useMutationState` filtered on the `["todos", ...]` key prefix so a 401/403 on
// reconnect has a visible recovery path instead of failing silently.
export type TodoReplayStatus = {
	hasErrors: boolean
	isAuthExpired: boolean
	message: string | null
}

export function useTodoReplayErrors(): TodoReplayStatus {
	const errors = useMutationState({
		filters: { mutationKey: ["todos"], status: "error" },
		select: mutation => mutation.state.error,
	})

	const isAuthExpired = errors.some(isAuthError)
	const first = errors[0]

	return {
		hasErrors: errors.length > 0,
		isAuthExpired,
		message: isAuthExpired
			? "Your session expired. Sign in again to sync your queued changes."
			: first instanceof Error
				? first.message
				: errors.length > 0
					? "A queued change failed to sync. Please retry."
					: null,
	}
}
