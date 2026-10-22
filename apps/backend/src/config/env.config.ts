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
		// This value MUST equal the real hop count (see DOMAIN-MODEL.md):
		//   1 = one hop. Local / dev: nginx sets X-Forwarded-For to $remote_addr
		//       (overwrite, not append). Production: the load balancer appends the
		//       address it saw, and Express keeps that rightmost entry.
		//       ThrottlerProxyGuard keys on that rightmost entry. Raising this
		//       value alone does not move the guard's key; an extra hop needs
		//       TRUST_PROXY and getTracker updated together. Staging is EC2 plus
		//       an Elastic IP, and host Nginx on the instance is the single
		//       trusted hop (TRUST_PROXY=1). Health is checked on the host
		//       over SSH.
		//   0 = no trusted hop. X-Forwarded-For is ignored and the socket peer is used.
		TRUST_PROXY: z.coerce.number().int().min(0).default(1),

		// Security headers. HSTS is a promise the browser remembers, so it
		// stays off until TLS actually terminates in the target environment.
		// Enabling it early pins clients to HTTPS a deployment cannot
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
		/** Deploy image tag, injected by the deploy compose file / env; reported as the Sentry release. */
		IMAGE_TAG: z.string().optional(),

		// Database
		DATABASE_URL: z.string(),

		// Redis. Shared state for the throttler and the RBAC permission
		// cache. Optional so a single-instance local run still boots, but see
		// the degradation notes in redis.provider.ts: without it, rate limits
		// multiply by instance count and a revoked permission only dies on the
		// instance that revoked it.
		REDIS_URL: z.string().optional(),
		/** Key prefix, so several environments can share one Redis safely. */
		REDIS_KEY_PREFIX: z.string().optional().default("turbo-template"),

		// Authentication.
		// Same schema object the @repo/auth package validates with — the two
		// processes sign the same sessions, so their rules must never drift.
		BETTER_AUTH_SECRET: authSecretSchema,
		BETTER_AUTH_TRUSTED_ORIGINS: z.string(),

		// OAuth (optional)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
	},
	runtimeEnv: process.env,
	// Validation is never skipped merely because CI is set.
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
