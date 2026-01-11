import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const ConsultationQuerySchema = PaginationSchema.extend({
	doctorId: z.string().uuid().optional(),
	patientId: z.string().uuid().optional(),
})

export const ConsultationSchema = z.object({
	id: z.string().uuid(),
	doctorId: z.string().uuid(),
	patientId: z.string().uuid(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime().nullable().optional(),
	consultationCode: z.string(),
	isPublic: z.boolean(),
	notes: z.string().nullable().optional(),
	diagnosis: z.string().nullable().optional(),
	treatment: z.string().nullable().optional(),
	followUpDate: z.string().datetime().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class ConsultationQueryDto extends createZodDto(ConsultationQuerySchema) {}

export class ConsultationResponseDto extends createZodDto(ApiSuccessResponseSchema(ConsultationSchema)) {}

export class ConsultationListResponseDto extends createZodDto(ApiSuccessResponseSchema(ConsultationSchema.array())) {}
