import type { PostHog } from "posthog-js"

import { loadedPosthog, loadPosthog } from "@/core/lib/posthog-client"
import { isPosthogClientEnabled } from "@/core/lib/posthog-config"

/** The two PostHog calls identity needs; tests pass a stand-in. */
export type PosthogLike = Pick<PostHog, "identify" | "reset">

/**
 * Which user this browser last identified as, or nothing for anonymous.
 *
 * PostHog keeps its own identity across reloads; this marker is how the app
 * knows whether that identity belongs to a signed-in user, so a signed-out
 * page can reset it without resetting (and rotating) an anonymous visitor's
 * id on every page load.
 */
const IDENTIFIED_KEY = "analytics-identified"

/**
 * Runs `action` with the given client, else the loaded one at once, else once
 * PostHog has loaded. The middle case keeps sign-out's reset synchronous.
 */
function withClient(client: PosthogLike | undefined, action: (client: PosthogLike) => void): void {
	const ready = client ?? loadedPosthog()
	if (ready) {
		action(ready)
		return
	}
	void loadPosthog().then(lazy => {
		if (lazy) action(lazy)
	})
}

function readMarker(): string | null {
	try {
		return window.localStorage.getItem(IDENTIFIED_KEY)
	} catch {
		return null
	}
}

function writeMarker(userId: string | null): void {
	try {
		if (userId) window.localStorage.setItem(IDENTIFIED_KEY, userId)
		else window.localStorage.removeItem(IDENTIFIED_KEY)
	} catch {
		// Storage unavailable (private mode): identify still runs, the next
		// page simply cannot tell whether a reset is due.
	}
}

/**
 * Makes PostHog's identity match the session.
 *
 * Privacy-safe default (same rule as mobile): no previous user's identity
 * survives into another session. A different user resets first, then
 * identifies; a signed-out page resets once if this browser was identified.
 * Only the user id is sent, never an email or a name.
 */
export function syncAnalyticsIdentity(
	userId: string | null,
	client?: PosthogLike,
	enabled: boolean = isPosthogClientEnabled
): void {
	if (!enabled) return

	const identified = readMarker()
	if (userId === identified) return

	withClient(client, ready => {
		// `true` also rotates $device_id; without it two users on one browser
		// stay linkable through the device id.
		if (identified) ready.reset(true)
		if (userId) ready.identify(userId)
		writeMarker(userId)
	})
}

/**
 * Forgets the signed-in user. Sign-out calls this before it navigates, so the
 * pageview of the page it lands on is already anonymous.
 */
export function resetAnalyticsIdentity(
	client?: PosthogLike,
	enabled: boolean = isPosthogClientEnabled
): void {
	if (!enabled) return

	withClient(client, ready => {
		ready.reset(true)
		writeMarker(null)
	})
}
