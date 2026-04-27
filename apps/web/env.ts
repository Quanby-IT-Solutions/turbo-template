import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

/**
 * Type-safe environment variable validation for Web App
 *
 * All environment variables are validated at build time to ensure the app
 * isn't built with invalid environment variables.
 */
export const env = createEnv({
	/**
	 * Shared variables - available on both client and server
	 */
	shared: {
		// Server Configuration
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	},

	/**
	 * Server-side environment variables
	 * These are only available on the server and will NOT be exposed to the client
	 */
	server: {
		INTERNAL_API_BASE_URL: z.url().optional(),
	},

	/**
	 * Client-side environment variables
	 * These are exposed to the browser. Prefix them with `NEXT_PUBLIC_`.
	 */
	client: {
		// Public URLs
		NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3001"),
		NEXT_PUBLIC_API_BASE_URL: z.url().default("http://localhost:3000/api"),
		NEXT_PUBLIC_API_VERSION: z.string().default("v1"),
	},

	/**
	 * Destructure all client variables from `process.env` to make sure they aren't
	 * tree-shaken away during the build process.
	 */
	runtimeEnv: {
		// Server Configuration
		NODE_ENV: process.env.NODE_ENV,
		INTERNAL_API_BASE_URL: process.env.INTERNAL_API_BASE_URL,

		// Client-side variables
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
		NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION,
	},

	/**
	 * Skip validation during CI or linting to prevent errors in non-build contexts
	 */
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})
