import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const SubscriptionSchema = z.object({
	id: z.string().uuid(),
	entityType: z.enum(["ORGANIZATION", "DOCTOR", "PATIENT"]),
	entityId: z.string().uuid(),
	tier: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE", "T"]),
	startDate: z.string().datetime(),
	endDate: z.string().datetime().nullable().optional(),
	isActive: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class SubscriptionResponseDto extends createZodDto(ApiSuccessResponseSchema(SubscriptionSchema)) {}

export class SubscriptionListResponseDto extends createZodDto(ApiSuccessResponseSchema(SubscriptionSchema.array())) {}
