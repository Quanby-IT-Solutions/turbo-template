import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import { booleanFromEnv, isApiDocsEnabled } from "@/config/api-docs.config"

export { isApiDocsEnabled }

/**
 * Type-safe environment variable validation for Backend API
 *
 * Validates at module load time (fail-fast). Access all env vars through this object.
 */
export const env = createEnv({
	server: {
		// Server
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		PORT: z.coerce.number().int().positive().default(3000),
		CORS_ORIGINS: z.string(),
		LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

		// API docs (Scalar UI + spec.json). Default is environment-aware via
		// isApiDocsEnabled(): on in development, off otherwise. Explicit value wins.
		ENABLE_API_DOCS: booleanFromEnv.optional(),

		// Rate limiting (throttler)
		THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
		THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
		THROTTLE_STRICT_TTL: z.coerce.number().int().positive().default(60000),
		THROTTLE_STRICT_LIMIT: z.coerce.number().int().positive().default(10),

		// Proxy trust (number of hops in front of the app)
		TRUST_PROXY: z.coerce.number().int().min(0).default(1),

		// Database
		DATABASE_URL: z.string(),

		// Authentication
		BETTER_AUTH_SECRET: z.string(),
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),

		// OAuth (optional)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})

export type Env = typeof env
