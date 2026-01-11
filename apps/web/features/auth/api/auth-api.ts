/**
 * Authentication API functions
 */

import { apiRequest } from "@/services/api/client"

import type { ApiResponse, AuthResponse, RegisterRequest, User } from "@/services/api/types"

export const authApi = {
	/**
	 * Login user
	 */
	login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
		return apiRequest<AuthResponse>("/v1/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		})
	},

	/**
	 * Register new user
	 */
	register: async (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
		return apiRequest<AuthResponse>("/v1/auth/register", {
			method: "POST",
			body: JSON.stringify(data),
		})
	},

	/**
	 * Get current user profile
	 */
	getProfile: async (): Promise<ApiResponse<User>> => {
		return apiRequest<User>("/v1/auth/profile", {
			method: "GET",
		})
	},

	/**
	 * Update current user profile
	 */
	updateProfile: async (data: Record<string, unknown>): Promise<ApiResponse<User>> => {
		return apiRequest<User>("/v1/auth/profile", {
			method: "PUT",
			body: JSON.stringify(data),
		})
	},

	/**
	 * Refresh session (Better Auth handles this automatically via cookies)
	 */
	refreshToken: async (sessionToken?: string): Promise<ApiResponse<AuthResponse>> => {
		const token =
			sessionToken ||
			(typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null)
		return apiRequest<AuthResponse>("/v1/auth/refresh", {
			method: "POST",
			body: JSON.stringify({
				sessionToken: token,
				refreshToken: token, // Keep for backward compatibility
			}),
		})
	},

	/**
	 * Logout user
	 */
	logout: async (): Promise<ApiResponse> => {
		return apiRequest("/v1/auth/logout", {
			method: "POST",
		})
	},
}
