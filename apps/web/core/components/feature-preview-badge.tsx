"use client"

import { Badge } from "@/core/components/ui/badge"
import { useFeatureFlag } from "@/core/hooks/use-feature-flag"

/**
 * The template's worked example of a web feature flag.
 *
 * A "Preview" badge that exists only while the PostHog flag `template-preview`
 * is on for this visitor. The same flag gates the backend example route
 * `GET /api/v1/example/feature-preview`. With analytics off it never shows.
 */
export function FeaturePreviewBadge() {
	if (!useFeatureFlag("template-preview")) return null

	return <Badge variant="secondary">Preview</Badge>
}
