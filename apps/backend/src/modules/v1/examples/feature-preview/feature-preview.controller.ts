import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { FeatureFlag } from "@/shared/decorators/feature-flag.decorator"

/**
 * The worked example of `@FeatureFlag()`.
 *
 * Signed-in only (no `@AllowAnonymous`), because the flag is evaluated for the
 * session's user id. Flip `template-preview` in PostHog and this route goes
 * from 404 to 200 for the users the flag is rolled out to.
 */
@Controller()
export class FeaturePreviewController {
	@FeatureFlag("template-preview")
	@Implement(v1.example.featurePreview.get)
	getFeaturePreview() {
		return implement(v1.example.featurePreview.get).handler(() => ({
			enabled: true as const,
			flag: "template-preview" as const,
		}))
	}
}
