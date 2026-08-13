import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import { authSecretSchema } from "@repo/auth/secret-schema"

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

		// Proxy trust: the number of trusted reverse-proxy hops in front of the app.
		//
		// Risky Flow RF2 (client-IP trust chain). This value MUST match the real
		// topology and stay in lockstep with nginx.conf:
		//   1 = the shipped single-Nginx setup, where Nginx *overwrites*
		//       X-Forwarded-For with $remote_addr, so Express keeps exactly the
		//       proxy-authored entry and ThrottlerProxyGuard keys on a value no
		//       client can influence.
		//   0 = backend directly internet-exposed — X-Forwarded-For is ignored
		//       entirely and the socket peer is used.
		// Setting this HIGHER than the real hop count re-opens F-02: Express would
		// retain client-written entries and a caller could mint a fresh rate-limit
		// bucket per request.
		TRUST_PROXY: z.coerce.number().int().min(0).default(1),

		// Security headers (ED-1). HSTS is a promise the browser remembers, so it
		// stays off until TLS actually terminates in the target environment
		// (ED-2). Enabling it early pins clients to HTTPS a deployment cannot
		// serve, and max-age cannot be withdrawn quickly.
		ENABLE_HSTS: booleanFromEnv.optional().default(false),

		// Error monitoring (Sentry).
		//
		// Declared here so the rest of the app sees the same typed, defaulted,
		// validated values as every other setting. `src/instrument.ts` deliberately
		// does NOT import this module — it runs before AppModule to install the SDK
		// ahead of the libraries it instruments, and pulling fail-fast validation
		// onto that path would let one unrelated bad variable kill the crash
		// reporter right when it is most needed. It reads these same keys off
		// `process.env` instead; the exemption is documented at the top of that file
		// and is bounded to exactly the keys below.
		//
		// Reporting stays OFF unless BOTH the flag and a DSN are supplied: a flag
		// with no DSN is an unfinished deployment, a DSN with no flag is a value
		// parked for later, and neither is consent to start shipping events.
		SENTRY_ENABLED: booleanFromEnv.optional().default(false),
		SENTRY_DSN: z.string().optional(),
		/** Falls back to NODE_ENV when unset, so environments are never merged by accident. */
		SENTRY_ENVIRONMENT: z.string().optional(),
		/** 0 = errors only. Tracing costs quota, so it is opt-in per environment. */
		SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional().default(0),
		/** Deploy image tag, injected by the compose/ECS task definition; reported as the Sentry release. */
		IMAGE_TAG: z.string().optional(),

		// Database
		DATABASE_URL: z.string(),

		// Redis (AB-2). Shared state for the throttler and the RBAC permission
		// cache. Optional so a single-instance local run still boots, but see
		// the degradation notes in redis.provider.ts: without it, rate limits
		// multiply by instance count and a revoked permission only dies on the
		// instance that revoked it.
		REDIS_URL: z.string().optional(),
		/** Key prefix, so several environments can share one Redis safely. */
		REDIS_KEY_PREFIX: z.string().optional().default("turbo-template"),

		// Authentication.
		// Same schema object the @repo/auth package validates with — the two
		// processes sign the same sessions, so their rules must never drift (F-03).
		BETTER_AUTH_SECRET: authSecretSchema,
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),

		// OAuth (optional)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
	},
	runtimeEnv: process.env,
	// CI-4 / F-16 (RF3): validation is never skipped merely because CI is set.
	// It was disabled in exactly the environment meant to catch misconfiguration,
	// so a missing or malformed value shipped instead of failing the build.
	// `SKIP_ENV_VALIDATION` is the one documented escape hatch, for build-only
	// jobs that have no runtime configuration to validate.
	// `lint` stays exempt: ESLint loads modules for type information and has no
	// business asserting the runtime environment.
	skipValidation:
		process.env.SKIP_ENV_VALIDATION === "true" || process.env.npm_lifecycle_event === "lint",
})

export type Env = typeof env
