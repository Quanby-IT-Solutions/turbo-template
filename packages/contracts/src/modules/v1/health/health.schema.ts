import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================
const ServiceCheckSchema = z.object({
	status: z.string(),
	message: z.string().optional(),
})

export const HealthCheckSchema = z.object({
	status: z.string(),
	timestamp: z.string(),
	// These fields are optional because the unauthenticated endpoint omits them.
	// Uptime dates the last deploy, version identifies which published
	// vulnerabilities apply, and environment confirms a probe reached
	// production. None serve a liveness check. `status` and
	// `checks.database.status` are unchanged — Compose healthchecks and the
	// probe depend on them.
	uptime: z.number().optional(),
	version: z.string().optional(),
	environment: z.string().optional(),
	checks: z.object({
		database: ServiceCheckSchema,
	}),
})
