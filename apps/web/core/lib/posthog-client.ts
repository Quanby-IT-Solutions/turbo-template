import type { PostHog } from "posthog-js"

import { clientPosthogToken, posthogInitOptions } from "@/core/lib/posthog-config"

let loading: Promise<PostHog | undefined> | undefined
let loaded: PostHog | undefined

/**
 * posthog-js, downloaded and initialized on first call, or `undefined` when
 * PostHog is off. The only module that imports the SDK at runtime: a static
 * import anywhere puts the ~350 KB library on every page even with analytics
 * off (measured in the PAL-210 walk, 11/4), so with no token it is never
 * fetched at all.
 */
export function loadPosthog(
	token: string | undefined = clientPosthogToken
): Promise<PostHog | undefined> {
	if (!token) return Promise.resolve(undefined)
	loading ??= import("posthog-js").then(({ default: posthog }) => {
		posthog.init(token, posthogInitOptions())
		loaded = posthog
		return posthog
	})
	return loading
}

/**
 * The client if it has already loaded, for callers that must act before
 * returning (sign-out resets identity before it navigates). The bootstrap
 * starts loading at app start, so this is set long before any user action.
 */
export function loadedPosthog(): PostHog | undefined {
	return loaded
}
