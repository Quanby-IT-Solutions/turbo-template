/**
 * Base API client functions
 */

import { env } from "@/env"

import type { ApiResponse, User } from "./types"

const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

/**
 * Make an API request to the backend
 * Better Auth sessions are automatically handled via cookies
 */
export async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<ApiResponse<T>> {
	const url = `${API_BASE_URL}${endpoint}`

	const defaultHeaders: HeadersInit = {
		"Content-Type": "application/json",
	}

	// Better Auth uses cookies for session management
	// If we have a session token, we can optionally include it in a header
	// But Better Auth primarily uses cookies (automatic with credentials: 'include')
	// Use getSessionToken() to also check session object if direct token not found
	const sessionToken = typeof window !== "undefined" ? getSessionToken() : null

	// Convert Headers object to plain object if needed for proper merging
	const optionsHeaders =
		options.headers instanceof Headers
			? Object.fromEntries(options.headers.entries())
			: options.headers || {}

	// Include credentials to send cookies (required for Better Auth)
	const config: RequestInit = {
		...options,
		credentials: "include", // Required for Better Auth session cookies
		headers: {
			...defaultHeaders,
			...optionsHeaders,
		},
	}

	// Always add session token header if available (required for authentication)
	// This helps when cookies aren't being sent properly or backend requires header
	if (sessionToken && !config.headers?.["Authorization"]) {
		;(config.headers as Record<string, string>)["Authorization"] = `Bearer ${sessionToken}`
	}

	try {
		console.log("🌐 Making API request", { 
			url, 
			method: config.method || "GET",
			hasSessionToken: !!sessionToken,
			sessionTokenPrefix: sessionToken ? sessionToken.substring(0, 20) : null,
			hasCookies: config.credentials === "include",
			authorizationHeader: config.headers?.["Authorization"] ? "Bearer ***" : "none",
		})
		
		const response = await fetch(url, config)
		
		console.log("📡 API response received", {
			url,
			status: response.status,
			statusText: response.statusText,
			contentType: response.headers.get("content-type"),
		})
		
		// Check content type before parsing JSON
		const contentType = response.headers.get("content-type")
		const isJson = contentType?.includes("application/json")
		
		if (!isJson) {
			// If response is not JSON (likely HTML 404 page), return error
			const text = await response.text()
			console.error("❌ Non-JSON response received:", text.substring(0, 200))
			return {
				success: false,
				message: `API endpoint not found: ${url}`,
				error: "NOT_FOUND",
			}
		}
		
		const data = await response.json()

		if (!response.ok) {
			// Only log server errors (5xx) and client errors other than validation (400)
			// 400 Bad Request errors are validation errors handled by toast notifications
			if (response.status !== 400) {
				console.error("❌ API request failed", {
					url,
					status: response.status,
					statusText: response.statusText,
					error: data.error,
					message: data.message,
					hasSessionToken: !!sessionToken,
					hasAuthHeader: !!config.headers?.["Authorization"],
				})
			}

			// Handle 401 Unauthorized - token might be expired or invalid
			if (response.status === 401) {
				console.warn("⚠️ 401 Unauthorized - checking session token", {
					sessionTokenExists: !!sessionToken,
					sessionTokenLength: sessionToken?.length,
					sessionTokenPrefix: sessionToken?.substring(0, 20),
					url,
					responseData: data,
					responseKeys: Object.keys(data || {}),
					fullResponse: JSON.stringify(data, null, 2),
				})

				// Don't clear tokens immediately - let the calling code handle it
				// The token might be valid but the endpoint might require different permissions
				return {
					success: false,
					message: data.message || "Unauthorized. Please log in again.",
					error: "UNAUTHORIZED",
					data: data.data,
					errors: data.errors || [],
				}
			}

			return {
				success: false,
				message: data.message || "An error occurred",
				error: data.error || "UNKNOWN_ERROR",
				data: data.data,
				errors: data.errors || [], // Include validation errors array
			}
		}
		
		console.log("✅ API request successful", { url })

		// Handle different response formats
		// If backend returns array directly, wrap it in ApiResponse
		if (Array.isArray(data)) {
			return {
				success: true,
				message: "",
				data: data as T,
			} as ApiResponse<T>
		}

		// If backend returns object with success property, return as is
		if (data && typeof data === "object" && "success" in data) {
			return data as ApiResponse<T>
		}

		// If backend returns object without success property, wrap it
		return {
			success: true,
			message: "",
			data: data as T,
		} as ApiResponse<T>
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Network error occurred",
			error: "NETWORK_ERROR",
		}
	}
}

/**
 * Get stored session token (Better Auth)
 * Also tries to extract token from session object if direct token not found
 */
export function getSessionToken(): string | null {
	if (typeof window === "undefined") return null

	// Try to get token directly
	let token = localStorage.getItem("sessionToken")

	// If no direct token, try to extract from session object
	if (!token) {
		try {
			const sessionStr = localStorage.getItem("session")
			if (sessionStr) {
				const session = JSON.parse(sessionStr)
				token = session?.token || session?.id || null
				// If we found a token in session, store it directly for faster access
				if (token && typeof token === "string") {
					localStorage.setItem("sessionToken", token)
				}
			}
		} catch {
			// Ignore parse errors
		}
	}

	return token
}

/**
 * Store session token (Better Auth)
 */
export function setSessionToken(sessionToken: string): void {
	if (typeof window === "undefined") return
	localStorage.setItem("sessionToken", sessionToken)
}

/**
 * Store session data (Better Auth)
 */
export function setSession(sessionToken: string, session?: unknown): void {
	if (typeof window === "undefined") return
	localStorage.setItem("sessionToken", sessionToken)
	if (session) {
		localStorage.setItem("session", JSON.stringify(session))
	}
}

/**
 * Clear session and tokens
 */
export function clearTokens(): void {
	if (typeof window === "undefined") return
	localStorage.removeItem("sessionToken")
	localStorage.removeItem("session")
	localStorage.removeItem("user")
	// Keep backward compatibility - remove old JWT tokens if they exist
	localStorage.removeItem("token")
	localStorage.removeItem("refreshToken")
}

/**
 * Get stored token (deprecated - kept for backward compatibility)
 * @deprecated Use getSessionToken() instead
 */
export function getToken(): string | null {
	return getSessionToken()
}

/**
 * Get stored refresh token (deprecated - Better Auth handles this via sessions)
 * @deprecated Better Auth handles refresh automatically
 */
export function getRefreshToken(): string | null {
	return getSessionToken() // Return session token as fallback
}

/**
 * Store tokens (deprecated - kept for backward compatibility)
 * @deprecated Use setSession() instead
 */
export function setTokens(token: string, refreshToken?: string): void {
	// Store as session token for Better Auth compatibility
	setSessionToken(token)
	if (refreshToken) {
		localStorage.setItem("refreshToken", refreshToken) // Keep for backward compatibility
	}
}

/**
 * Get stored user
 */
export function getUser(): User | null {
	if (typeof window === "undefined") return null
	const userStr = localStorage.getItem("user")
	return userStr ? (JSON.parse(userStr) as User) : null
}

/**
 * Store user
 */
export function setUser(user: User): void {
	if (typeof window === "undefined") return
	localStorage.setItem("user", JSON.stringify(user))
}
