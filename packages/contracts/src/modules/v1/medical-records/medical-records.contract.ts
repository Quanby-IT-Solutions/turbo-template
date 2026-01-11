import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const MedicalRecordQuerySchema = PaginationSchema.extend({
	patientId: z.string().uuid().optional(),
	recordType: z.string().optional(),
})

export const CreateMedicalRecordSchema = z.object({
	patientId: z.string().uuid(),
	consultationId: z.string().uuid().optional(),
	recordType: z.enum([
		"CONSULTATION_NOTES",
		"DIAGNOSIS",
		"TREATMENT_PLAN",
		"MEDICATION",
		"LAB_RESULTS",
		"IMAGING_RESULTS",
		"ALLERGIES",
		"CHRONIC_CONDITIONS",
		"SURGICAL_HISTORY",
		"FAMILY_HISTORY",
		"LIFESTYLE",
		"VACCINATIONS",
	]),
	title: z.string(),
	content: z.string(),
	isPublic: z.boolean().optional(),
	isSensitive: z.boolean().optional(),
})

export const MedicalRecordSchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
	consultationId: z.string().uuid().nullable().optional(),
	recordType: z.string(),
	title: z.string(),
	content: z.string(),
	isPublic: z.boolean(),
	isSensitive: z.boolean(),
	createdBy: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class MedicalRecordQueryDto extends createZodDto(MedicalRecordQuerySchema) {}

export class CreateMedicalRecordDto extends createZodDto(CreateMedicalRecordSchema) {}

export class MedicalRecordResponseDto extends createZodDto(ApiSuccessResponseSchema(MedicalRecordSchema)) {}

export class MedicalRecordListResponseDto extends createZodDto(ApiSuccessResponseSchema(MedicalRecordSchema.array())) {}
