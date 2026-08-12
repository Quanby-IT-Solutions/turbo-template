import { createZodDto } from "nestjs-zod"
import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================
/**
 * Health response (LG-2 / F-36).
 *
 * `uptime`, `version` and `environment` are OPTIONAL because the
 * unauthenticated endpoint omits them. They used to be sent to anyone who
 * asked: uptime dates the last deploy, version identifies which published
 * vulnerabilities apply, and environment confirms a probe reached production.
 * None help a liveness check; all three help someone deciding what to try.
 *
 * The shape deploy healthchecks and WC-4's probe depend on — `status` plus
 * `checks.database.status` — is unchanged.
 */
export const HealthCheckSchema = z.object({
	status: z.enum(["ok", "error"]),
	timestamp: z.iso.datetime(),
	uptime: z.number().optional(),
	version: z.string().optional(),
	environment: z.string().optional(),
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
