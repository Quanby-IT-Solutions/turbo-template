/**
 * Browser-side Sentry initialization.
 *
 * Next.js loads this file automatically at the top of the client bundle — it is
 * a framework entrypoint, not something the app imports, which is why it sits
 * at the app root next to `next.config.ts`.
 *
 * Nothing here runs unless `NEXT_PUBLIC_SENTRY_ENABLED` is on AND
 * `NEXT_PUBLIC_SENTRY_DSN` parses as a DSN: the template ships with reporting
 * off, and a clone with no Sentry account must behave as if the SDK were absent.
 * A flag with a missing or malformed DSN warns once (see `sentry-config.ts`)
 * and stays disabled — loud, never fatal.
 *
 * Session Replay is deliberately never imported. It records the DOM, which
 * means it re-collects exactly the credentials and PII the deny-list in
 * `@repo/observability` exists to keep out of a retention system, and it does
 * so through a path `beforeSend` cannot scrub.
 */

import * as Sentry from "@sentry/nextjs"

import {
	clientSentryDsn,
	clientSentryEnvironment,
	scrubSentryBreadcrumb,
	scrubSentryEvent,
} from "@/core/lib/sentry-config"
import { env } from "@/env"

if (clientSentryDsn) {
	Sentry.init({
		dsn: clientSentryDsn,

		// `SENTRY_ENVIRONMENT` (projected onto the public twin at build time),
		// falling back to NODE_ENV — the same rule the server and edge runtimes
		// apply. NODE_ENV alone collapses "production build running in staging"
		// into plain `production`, which is exactly the distinction triage needs.
		environment: clientSentryEnvironment,

		// Never let the SDK attach IPs, cookies or request headers on its own.
		// Everything the app wants Sentry to know goes through `beforeSend`, where
		// it is scrubbed; `sendDefaultPii` would bypass that entirely.
		sendDefaultPii: false,

		// Tracing is opt-in and off by default. Sentry treats this as a
		// probability, so 0 means "errors only" — the cheapest useful config.
		tracesSampleRate: env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0,

		beforeSend: scrubSentryEvent,
		beforeBreadcrumb: scrubSentryBreadcrumb,
	})
}

/**
 * App Router navigation instrumentation.
 *
 * Next.js calls this on every client-side route transition. It is exported
 * unconditionally: when `Sentry.init` was skipped there is no client to record
 * against and the call is a no-op, whereas a conditional export would make the
 * module's shape depend on runtime configuration.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
