import { oc } from "@orpc/contract"
import { z } from "zod"

/**
 * The worked example of a backend feature flag.
 *
 * Served only while the PostHog flag `template-preview` is on for the
 * signed-in user (`@FeatureFlag("template-preview")` on the handler). Off, the
 * route answers 404 as if it did not exist; analytics off means always off.
 */
export const featurePreviewContract = {
	/**
	 * GET /feature-preview
	 */
	get: oc
		.route({
			method: "GET",
			path: "/feature-preview",
			summary: "Feature flag example",
			description:
				"Answers only while the PostHog flag template-preview is on for the signed-in user; 404 otherwise.",
			tags: ["Examples"],
		})
		.output(
			z.object({
				enabled: z.literal(true),
				flag: z.literal("template-preview"),
			})
		),
}
