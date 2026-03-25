import { createZodDto } from "nestjs-zod"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================
export const HealthCheckSchema = z.object({
	status: z.enum(["ok", "error"]),
	timestamp: z.iso.datetime(),
	uptime: z.number(),
	version: z.string(),
	environment: z.string(),
	checks: z.object({
		database: z
			.object({
				status: z.string(),
				message: z.string().optional(),
			})
			.catchall(z.unknown()),
		cache: z.object({
			status: z.string(),
			message: z.string().optional(),
		}),
	}),
})

// ============================================================================
// DTOs
// ============================================================================
export class HealthCheckDto extends createZodDto(HealthCheckSchema) {}
