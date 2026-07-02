"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
	CreateRoleInput,
	PermissionCatalogEntry,
	PermissionName,
	Role,
	UpdateRoleRequest,
	UserWithRoles,
} from "@repo/contracts"

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
		// Throw a status-carrying ApiError (matching the todo mutations) so the
		// shared 429 detection can classify rate limits and read Retry-After.
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

export const rbacKeys = {
	roles: ["rbac", "roles"] as const,
	permissions: ["rbac", "permissions"] as const,
	users: ["rbac", "users"] as const,
}

// ---------------------------------------------------------------- queries
export function useRolesQuery() {
	return useQuery({
		queryKey: rbacKeys.roles,
		queryFn: () => apiFetch<Role[]>("/rbac/roles"),
	})
}

export function usePermissionsQuery() {
	return useQuery({
		queryKey: rbacKeys.permissions,
		queryFn: () => apiFetch<PermissionCatalogEntry[]>("/rbac/permissions"),
		staleTime: 5 * 60 * 1000,
	})
}

export function useUsersQuery() {
	return useQuery({
		queryKey: rbacKeys.users,
		queryFn: () => apiFetch<UserWithRoles[]>("/rbac/users"),
	})
}

// -------------------------------------------------------------- mutations
export function useCreateRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (payload: CreateRoleInput) =>
			apiFetch<Role>("/rbac/roles", { method: "POST", body: JSON.stringify(payload) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: rbacKeys.roles }),
	})
}

export function useUpdateRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, ...rest }: UpdateRoleRequest) =>
			apiFetch<Role>(`/rbac/roles/${id}`, { method: "PUT", body: JSON.stringify(rest) }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: rbacKeys.roles }),
	})
}

export function useSetRolePermissionsMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, permissions }: { id: number; permissions: PermissionName[] }) =>
			apiFetch<Role>(`/rbac/roles/${id}/permissions`, {
				method: "PUT",
				body: JSON.stringify({ permissions }),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: rbacKeys.roles }),
	})
}

export function useDeleteRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: number) =>
			apiFetch<{ success: boolean; id: number }>(`/rbac/roles/${id}`, { method: "DELETE" }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: rbacKeys.roles }),
	})
}

export function useAssignRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
			apiFetch(`/rbac/users/${userId}/roles`, {
				method: "POST",
				body: JSON.stringify({ roleName }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rbacKeys.users })
			queryClient.invalidateQueries({ queryKey: rbacKeys.roles })
		},
	})
}

export function useRemoveRoleMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
			apiFetch(`/rbac/users/${userId}/roles/${encodeURIComponent(roleName)}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rbacKeys.users })
			queryClient.invalidateQueries({ queryKey: rbacKeys.roles })
		},
	})
}
