/**
 * Node runtime Sentry initialization, loaded by `instrumentation.ts`.
 *
 * Same two-part gate as the browser: `SENTRY_ENABLED` AND a `SENTRY_DSN` that
 * parses. A flag with no DSN is a misconfiguration, and `Sentry.init` with an
 * empty or malformed DSN silently no-ops in a way that is indistinguishable
 * from working — so `resolveSentryDsn` warns and disables instead of throwing.
 *
 * Session Replay is deliberately absent here too — see `instrumentation-client.ts`.
 */

import * as Sentry from "@sentry/nextjs"

import {
	resolveSentryDsn,
	resolveSentryEnvironment,
	scrubSentryBreadcrumb,
	scrubSentryEvent,
} from "@/core/lib/sentry-config"
import { env } from "@/env"

const dsn = resolveSentryDsn({
	dsn: env.SENTRY_DSN,
	flagEnabled: env.SENTRY_ENABLED,
	flagName: "SENTRY_ENABLED",
	dsnName: "SENTRY_DSN",
})

if (dsn) {
	Sentry.init({
		dsn,

		// NODE_ENV cannot express "a production build running in staging", which
		// is the distinction that matters when triaging. SENTRY_ENVIRONMENT wins
		// when set; otherwise the build mode is the honest answer.
		environment: resolveSentryEnvironment(env.SENTRY_ENVIRONMENT, env.NODE_ENV),

		// Reuses the release SHA chain the app already resolves, rather than
		// inventing a Sentry-specific scheme that would drift from it.
		release: env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA ?? env.GIT_COMMIT_SHA,

		// The server sees real request headers and bodies, so this matters more
		// here than in the browser: with PII on, Sentry attaches cookies and the
		// client IP before `beforeSend` ever runs.
		sendDefaultPii: false,

		// One sample-rate knob for every runtime — two would drift, and a trace
		// that is sampled on the client but not the server is worse than none.
		tracesSampleRate: env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0,

		// Strips the deny-listed fields, including `authorization`, `cookie` and
		// `set-cookie` off `request.headers`.
		beforeSend: scrubSentryEvent,
		beforeBreadcrumb: scrubSentryBreadcrumb,
	})
}
