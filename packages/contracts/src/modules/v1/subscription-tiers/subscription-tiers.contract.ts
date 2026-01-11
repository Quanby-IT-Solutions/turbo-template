import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const SubscriptionTierSettingSchema = z.object({
	id: z.string().uuid(),
	tier: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE", "T"]),
	entityType: z.enum(["ORGANIZATION", "DOCTOR", "PATIENT"]),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	maxDoctors: z.number().nullable().optional(),
	maxPatients: z.number().nullable().optional(),
	maxFaceScans: z.number().nullable().optional(),
	maxPatientsPerDoctor: z.number().nullable().optional(),
	maxFaceScansPerDoctor: z.number().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class SubscriptionTierSettingResponseDto extends createZodDto(ApiSuccessResponseSchema(SubscriptionTierSettingSchema)) {}

export class SubscriptionTierSettingListResponseDto extends createZodDto(
	ApiSuccessResponseSchema(SubscriptionTierSettingSchema.array())
) {}
