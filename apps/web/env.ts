import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

/**
 * Strict boolean-from-env parser.
 *
 * `z.coerce.boolean()` delegates to `Boolean(value)`, so the string "false"
 * coerces to `true` — any non-empty string is truthy. That silently flips a
 * feature flag to the opposite of what the operator wrote, so the accepted
 * spellings are enumerated instead and anything else fails validation.
 */
const booleanFromEnv = z
	.enum(["true", "false", "1", "0"])
	.transform(value => value === "true" || value === "1")

/**
 * `booleanFromEnv` for flags that are legitimately absent by default.
 *
 * "Unset" does not always arrive as `undefined`. Docker materializes an unset
 * `ARG` as `ENV NAME=`, and a shell `--build-arg NAME=$NAME` on an unset
 * variable does the same, so a build with no Sentry configuration hands the
 * parser an empty string instead of nothing at all. `booleanFromEnv` accepts
 * only the four spellings, so that empty string would fail validation and take
 * down the one build that must always succeed: the unconfigured one.
 *
 * Empty and whitespace-only values are therefore normalized to `undefined`
 * here, before the enum runs. Anything else still has to be a spelling the
 * enum accepts — a typo'd `NEXT_PUBLIC_SENTRY_ENABLED=yes` fails as loudly as
 * it did before.
 */
const optionalBooleanFromEnv = z.preprocess(
	value => (typeof value === "string" && value.trim() === "" ? undefined : value),
	booleanFromEnv.optional()
)

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
		VERCEL_GIT_COMMIT_SHA: z.string().optional(),
		GITHUB_SHA: z.string().optional(),
		GIT_COMMIT_SHA: z.string().optional(),

		// Sentry — server and edge runtimes. Every value is optional because the
		// template ships with crash reporting OFF: a contributor clone must build
		// and run without a Sentry account. The runtime gate is `SENTRY_ENABLED`
		// AND `SENTRY_DSN`, never either one alone (see `sentry.server.config.ts`).
		SENTRY_ENABLED: optionalBooleanFromEnv,
		// Deliberately a plain string rather than `z.url()`. A DSN typo is an
		// observability misconfiguration, and failing validation here would take
		// the whole build or boot down with it — the one outcome worse than not
		// reporting. Shape is checked in `core/lib/sentry-config.ts`, which warns
		// and disables the SDK instead of throwing, and the development
		// diagnostics page reports the same verdict.
		SENTRY_DSN: z.string().optional(),
		// Falls back to NODE_ENV when unset. Worth separating because "production
		// build running in staging" is the case NODE_ENV cannot express.
		SENTRY_ENVIRONMENT: z.string().optional(),

		// Build-time source-map upload only, read by the bundler plugin in
		// `next.config.ts`. Deliberately server-scoped and never `NEXT_PUBLIC_*`:
		// the auth token is a write credential for the Sentry org, and a public
		// var is inlined into the browser bundle verbatim. Absent by default,
		// which is what keeps upload inert for builds without Sentry configured.
		SENTRY_ORG: z.string().optional(),
		SENTRY_PROJECT: z.string().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),
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

		// Sentry — browser runtime. Same two-part gate as the server pair: the
		// flag alone does nothing without a DSN. The DSN is a public identifier
		// (write-only ingest key), which is why this one may be `NEXT_PUBLIC_*`
		// while `SENTRY_AUTH_TOKEN` must never be.
		NEXT_PUBLIC_SENTRY_ENABLED: optionalBooleanFromEnv,
		// Same reasoning as `SENTRY_DSN`: a malformed value is reported loudly by
		// `core/lib/sentry-config.ts`, never thrown during env parsing.
		NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
		// Browser twin of `SENTRY_ENVIRONMENT`, so a staging deployment tags its
		// client events the same way its server and edge events are tagged.
		// Falls back to NODE_ENV at the call site, exactly like the server pair.
		NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
		// Shared by the browser, server and edge inits. Bounded to 0–1 because
		// Sentry reads it as a probability and silently treats anything else as
		// "sample everything", which is a billing incident rather than an error.
		// Defaults to 0 at the call sites: tracing is opt-in, reporting is not.
		NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
	},

	/**
	 * Destructure all client variables from `process.env` to make sure they aren't
	 * tree-shaken away during the build process.
	 */
	runtimeEnv: {
		// Server Configuration
		NODE_ENV: process.env.NODE_ENV,
		INTERNAL_API_BASE_URL: process.env.INTERNAL_API_BASE_URL,
		VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
		GITHUB_SHA: process.env.GITHUB_SHA,
		GIT_COMMIT_SHA: process.env.GIT_COMMIT_SHA,

		// Sentry (server / edge / build)
		SENTRY_ENABLED: process.env.SENTRY_ENABLED,
		SENTRY_DSN: process.env.SENTRY_DSN,
		SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT: process.env.SENTRY_PROJECT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,

		// Client-side variables
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
		NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION,

		// Sentry (browser)
		NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		// Server-side (SSR, route handlers) this falls back to the server-only
		// variable directly. In the browser only `NEXT_PUBLIC_*` reads survive
		// bundling, which is why `next.config.ts` projects `SENTRY_ENVIRONMENT`
		// onto this key at build time when only the server one is set — both
		// runtimes then resolve the same environment.
		NEXT_PUBLIC_SENTRY_ENVIRONMENT:
			process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.SENTRY_ENVIRONMENT,
		NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
	},

	/**
	 * Skip validation during CI or linting to prevent errors in non-build contexts
	 */
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
