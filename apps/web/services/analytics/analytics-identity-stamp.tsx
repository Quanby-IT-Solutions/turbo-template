"use client"

import * as React from "react"

import { syncAnalyticsIdentity } from "@/services/analytics/posthog-identity"

/**
 * Keeps PostHog's identity in step with the session.
 *
 * Rendered by `CacheIdentity` beside the cache stamp, so the session is read
 * once for both. Runs in an effect: identity is a browser-side concern and the
 * SDK only exists there.
 */
export function AnalyticsIdentityStamp({ userId }: Readonly<{ userId: string | null }>) {
	React.useEffect(() => {
		syncAnalyticsIdentity(userId)
	}, [userId])

	return null
}
