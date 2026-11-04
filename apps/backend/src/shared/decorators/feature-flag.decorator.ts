import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common"

import { FeatureFlagGuard } from "@/shared/guards/feature-flag.guard"

export const FEATURE_FLAG_KEY = "feature_flag"

/**
 * Serves the handler only while the PostHog flag `key` is on for the
 * signed-in user; otherwise the route answers 404, as if it did not exist.
 *
 * Off by default: with analytics off, PostHog down or slow, the flag reads as
 * off (see `FeatureFlagsService`). Use it on signed-in routes only; the flag is
 * evaluated for the session's user id.
 */
export const FeatureFlag = (key: string) =>
	applyDecorators(SetMetadata(FEATURE_FLAG_KEY, key), UseGuards(FeatureFlagGuard))
