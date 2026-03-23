import { oc } from "@orpc/contract"

import { HealthCheckSchema } from "./health.schema.js"

/**
 * Health API contract
 * Defines the health check endpoint for monitoring
 */
export const healthContract = {
	/**
	 * Health check
	 * GET /health
	 */
	check: oc
		.route({
			method: "GET",
			path: "/health",
			summary: "Health check",
			description: "Returns the health status of the API and its dependencies",
			tags: ["Health"],
			spec: spec => ({ ...spec, security: [] }),
		})
		.output(HealthCheckSchema),
}
