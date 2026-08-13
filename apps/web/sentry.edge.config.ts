/**
 * Edge runtime Sentry initialization, loaded by `instrumentation.ts`.
 *
 * Same gate, release chain and scrubbers as the Node config. It is a separate
 * file rather than a shared one because the two runtimes resolve `@sentry/nextjs`
 * to different builds, and the edge bundle must not pull in the Node SDK.
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
		environment: resolveSentryEnvironment(env.SENTRY_ENVIRONMENT, env.NODE_ENV),
		release: env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA ?? env.GIT_COMMIT_SHA,
		sendDefaultPii: false,
		tracesSampleRate: env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0,
		beforeSend: scrubSentryEvent,
		beforeBreadcrumb: scrubSentryBreadcrumb,
	})
}
