import { Logger } from "@nestjs/common"
import { PostHog } from "posthog-node"

import { scrubEventProperties } from "@repo/observability"

export const POSTHOG_CLIENT = Symbol("POSTHOG_CLIENT")

export type PosthogClient = PostHog | null

/**
 * How long one feature flag evaluation may take before it reads as off.
 *
 * Shared by the SDK's own request timeout and `FeatureFlagsService`'s outer
 * race, so a PostHog outage costs a guarded request at most this long.
 */
export const POSTHOG_FLAG_TIMEOUT_MS = 1500

export type PosthogClientConfig = {
	enabled: boolean
	token?: string
	host: string
	/** Turns on local flag evaluation. Without it flags are evaluated remotely. */
	secretKey?: string
}

const logger = new Logger("PostHog")

/**
 * The one PostHog client, or `null` when analytics is off.
 *
 * Off unless BOTH the flag and a token are set, the same two-part gate as
 * Sentry: a flag without a token warns once and stays off, a token without the
 * flag is a value parked for later. With `null` nothing is constructed, so a
 * clone with no PostHog account makes no network call.
 *
 * Privacy: every event's properties go through the shared deny-list scrub, and
 * GeoIP stays at the Node SDK default (off), so a server IP is never resolved
 * into a user's location.
 */
export function createPosthogClient(
	config: PosthogClientConfig,
	warn: (message: string) => void = message => logger.warn(message)
): PosthogClient {
	if (!config.enabled) return null

	const token = config.token?.trim()
	if (!token) {
		warn(
			"POSTHOG_ENABLED is on but POSTHOG_TOKEN is not set — analytics and feature flags stay off."
		)
		return null
	}

	return new PostHog(token, {
		host: config.host,
		...(config.secretKey ? { secretKey: config.secretKey } : {}),
		featureFlagsRequestTimeoutMs: POSTHOG_FLAG_TIMEOUT_MS,
		before_send: event => ({
			...event,
			properties: event.properties ? scrubEventProperties(event.properties) : event.properties,
		}),
	})
}
