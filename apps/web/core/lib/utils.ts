import { cache } from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { env } from "@/env"

const DEFAULT_APP_URL = "http://localhost:3001"
const DEFAULT_API_BASE_URL = `${DEFAULT_APP_URL}/api`
const DEFAULT_API_VERSION = "v1"

/**
 * Merge class names into a single string
 * @param inputs - The class names to merge
 * @returns The merged class name
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Get the application URL
 * @returns The application URL
 */
export const getAppUrl = cache(() => {
	return env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
})

/**
 * Get the API URL
 * @returns The API URL
 */
export const getApiUrl = cache(() => {
	const baseUrl = (env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "")
	const version = (env.NEXT_PUBLIC_API_VERSION || DEFAULT_API_VERSION).replace(/^\//, "")

	return `${baseUrl}/${version}`
})

/**
 * Get the initials of a name
 * @param name - The name to get the initials of
 * @returns The initials of the name
 */
export function getInitials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean)

	if (parts.length === 0) return ""
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()

	return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}
