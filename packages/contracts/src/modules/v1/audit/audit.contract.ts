import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const AuditQuerySchema = PaginationSchema.extend({
	userId: z.string().uuid().optional(),
	category: z.string().optional(),
	level: z.enum(["INFO", "WARNING", "ERROR", "CRITICAL"]).optional(),
})

export const AuditLogSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid().nullable().optional(),
	action: z.string(),
	category: z.string(),
	level: z.enum(["INFO", "WARNING", "ERROR", "CRITICAL"]),
	description: z.string(),
	ipAddress: z.string(),
	userAgent: z.string(),
	resourceType: z.string().nullable().optional(),
	resourceId: z.string().nullable().optional(),
	timestamp: z.string().datetime(),
	severity: z.string(),
})

// ============================================================================
// DTOs
// ============================================================================

export class AuditQueryDto extends createZodDto(AuditQuerySchema) {}

export class AuditLogResponseDto extends createZodDto(ApiSuccessResponseSchema(AuditLogSchema)) {}

export class AuditLogListResponseDto extends createZodDto(ApiSuccessResponseSchema(AuditLogSchema.array())) {}
