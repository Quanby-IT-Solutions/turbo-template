/**
 * Authentication utilities and role-based routing
 */

import type { User } from "@/services/api/types"

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "PATIENT" | "ORGANIZATION"

/**
 * Get the dashboard route based on user role
 */
export function getDashboardRoute(role: UserRole): string {
	const routes: Record<UserRole, string> = {
		SUPER_ADMIN: "/super-admin",
		ADMIN: "/admin",
		DOCTOR: "/doctor",
		PATIENT: "/patient",
		ORGANIZATION: "/organization/dashboard",
	}
	return routes[role] || "/dashboard"
}

/**
 * Check if user is authenticated (Better Auth session)
 */
export function isAuthenticated(): boolean {
	if (typeof window === "undefined") return false
	// Check for Better Auth session token
	const sessionToken = localStorage.getItem("sessionToken")
	// Also check for user data as secondary indicator
	const user = localStorage.getItem("user")
	// Better Auth sessions are primarily cookie-based, but we also store sessionToken
	return !!(sessionToken || user)
}

/**
 * Get current user role
 */
export function getUserRole(): UserRole | null {
	if (typeof window === "undefined") return null
	const userStr = localStorage.getItem("user")
	if (!userStr) return null
	const user = JSON.parse(userStr) as User
	return (user?.role as UserRole) || null
}
