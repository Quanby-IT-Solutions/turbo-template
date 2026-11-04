import type { PostHogConfig } from "posthog-js"

import { scrubEventProperties } from "@repo/observability"

import { env } from "@/env"

/**
 * The token the browser SDK initializes with, or `undefined` when PostHog must
 * not initialize at all.
 *
 * Same two-part gate as Sentry (`resolveSentryDsn`): the flag AND a token. A
 * flag without a token warns once and stays off; a token without the flag is
 * parked for later and says nothing. Never throws: a missing analytics token
 * must not stop the app it was meant to measure.
 */
export function resolvePosthogToken(options: {
	token: string | undefined
	flagEnabled: boolean | undefined
	flagName: string
	tokenName: string
}): string | undefined {
	if (!options.flagEnabled) return undefined

	const token = options.token?.trim()
	if (!token) {
		// eslint-disable-next-line no-console
		console.warn(
			`[posthog] ${options.flagName}=true but ${options.tokenName} is empty. ` +
				`PostHog is DISABLED in the browser — nothing is being sent.`
		)
		return undefined
	}

	return token
}

/** Token the browser SDK initializes with, or `undefined` when analytics is off. */
export const clientPosthogToken = resolvePosthogToken({
	token: env.NEXT_PUBLIC_POSTHOG_TOKEN,
	flagEnabled: env.NEXT_PUBLIC_POSTHOG_ENABLED,
	flagName: "NEXT_PUBLIC_POSTHOG_ENABLED",
	tokenName: "NEXT_PUBLIC_POSTHOG_TOKEN",
})

/** Whether the browser SDK initializes at all. Every PostHog call site checks this. */
export const isPosthogClientEnabled = Boolean(clientPosthogToken)

/**
 * `posthog.init` options.
 *
 * - Events go to `/ingest`, a same-origin rewrite in `next.config.ts`, so the
 *   CSP's `connect-src 'self'` already covers them and ad blockers do not drop
 *   them (the same reason Sentry uses its `/monitoring` tunnel).
 * - Person profiles only for signed-in users; replay and surveys off; no
 *   scripts loaded from PostHog at runtime, so nothing outside the bundle runs.
 * - Every event's properties pass the shared deny-list scrub.
 * - `defaults` is pinned, not `latest`, so an SDK upgrade cannot quietly change
 *   what is captured. That date captures pageviews on App Router navigation.
 */
export function posthogInitOptions(): Partial<PostHogConfig> {
	return {
		api_host: "/ingest",
		ui_host: "https://us.posthog.com",
		defaults: "2026-08-30",
		person_profiles: "identified_only",
		disable_session_recording: true,
		disable_surveys: true,
		disable_external_dependency_loading: true,
		before_send: event =>
			event && { ...event, properties: scrubEventProperties(event.properties ?? {}) },
	}
}
