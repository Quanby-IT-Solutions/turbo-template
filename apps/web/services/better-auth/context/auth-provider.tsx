"use client"

import { type PropsWithChildren } from "react"

/**
 * Wrapper for components that need Better Auth hooks.
 *
 * Better Auth's React client does not require a dedicated context provider,
 * but having a component makes it easier to swap in additional logic later
 * (e.g., refreshed session handling). For now it simply renders children.
 */
export function AuthProvider({ children }: PropsWithChildren) {
	return children
}
