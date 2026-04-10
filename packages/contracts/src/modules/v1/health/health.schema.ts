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
	uptime: z.number(),
	version: z.string(),
	environment: z.string(),
	checks: z.object({
		database: ServiceCheckSchema,
	}),
})
