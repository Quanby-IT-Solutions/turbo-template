import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import * as bcrypt from "bcryptjs"

import { createDBClient } from "@repo/db/client"
import { users, session, account, verification } from "@repo/db/schema"

/**
 * Creates a Better Auth instance configured with Drizzle adapter.
 *
 * The auth instance uses the database connection from @repo/db and is
 * configured to work across multiple apps (backend, web, mobile via API).
 *
 * Uses our unified User table instead of a separate Better Auth user table.
 * Includes custom bcrypt password hashing to match existing password hashes.
 *
 * @returns Better Auth instance
 */
export function createAuth(): ReturnType<typeof betterAuth> {
	const db = createDBClient()

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg", // PostgreSQL
			// Map Better Auth's expected 'user' to our unified 'users' table
			schema: {
				user: users, // Map Better Auth's 'user' to our unified 'users' table
				session,
				account,
				verification,
			},
		}),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			// Configure Better Auth to use bcrypt (matching our existing password hashes)
			password: {
				hash: async (password: string) => {
					return bcrypt.hash(password, 10)
				},
				verify: async (data: { password: string; hash: string }) => {
					return bcrypt.compare(data.password, data.hash)
				},
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
		},
		secret:
			process.env.BETTER_AUTH_SECRET ??
			process.env.JWT_SECRET ??
			process.env.AUTH_SECRET ??
			"change-in-production",
		baseURL:
			process.env.BETTER_AUTH_URL ??
			process.env.BASE_URL ??
			process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
			"http://localhost:3000",
		basePath: "/api/auth",
		trustedOrigins: process.env.TRUSTED_ORIGINS
			? process.env.TRUSTED_ORIGINS.split(",")
			: process.env.BETTER_AUTH_TRUSTED_ORIGINS
				? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
				: ["http://localhost:3000"],
		// Custom user schema - our User table already has all required fields
		user: {
			additionalFields: {
				role: {
					type: "string",
					required: true,
				},
				organizationId: {
					type: "string",
					required: false,
				},
			},
			// Map field names if needed (our table uses camelCase which should work)
			// Better Auth will convert UUID IDs to text automatically
		},
	})
}

/**
 * Default Better Auth instance.
 * This is the shared instance used across all apps.
 *
 * Lazy initialization to ensure environment variables are loaded before creating the instance.
 */
let _auth: ReturnType<typeof betterAuth> | null = null

export function getAuth(): ReturnType<typeof betterAuth> {
	if (!_auth) {
		_auth = createAuth()
	}
	return _auth
}

/**
 * Default Better Auth instance (lazy getter).
 * Use this for backward compatibility, but prefer getAuth() for explicit initialization.
 */
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
	get(_target, prop) {
		return getAuth()[prop as keyof ReturnType<typeof betterAuth>]
	},
})
