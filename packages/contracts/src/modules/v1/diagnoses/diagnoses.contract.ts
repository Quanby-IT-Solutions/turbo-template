import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const DiagnosisQuerySchema = PaginationSchema.extend({
	patientId: z.string().uuid().optional(),
	doctorId: z.string().uuid().optional(),
	status: z.enum(["ACTIVE", "RESOLVED", "CHRONIC", "SUSPECTED", "RULED_OUT"]).optional(),
})

export const CreateDiagnosisSchema = z.object({
	patientId: z.string().uuid(),
	doctorId: z.string().uuid(),
	consultationId: z.string().uuid().optional(),
	diagnosisCode: z.string().optional(),
	diagnosisName: z.string(),
	description: z.string().optional(),
	severity: z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]).optional(),
	status: z.enum(["ACTIVE", "RESOLVED", "CHRONIC", "SUSPECTED", "RULED_OUT"]).optional(),
	onsetDate: z.string().datetime().optional(),
	notes: z.string().optional(),
	isPrimary: z.boolean().optional(),
})

export const DiagnosisSchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid(),
	consultationId: z.string().uuid().nullable().optional(),
	diagnosisCode: z.string().nullable().optional(),
	diagnosisName: z.string(),
	description: z.string().nullable().optional(),
	severity: z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]),
	status: z.enum(["ACTIVE", "RESOLVED", "CHRONIC", "SUSPECTED", "RULED_OUT"]),
	onsetDate: z.string().datetime().nullable().optional(),
	diagnosedAt: z.string().datetime(),
	resolvedAt: z.string().datetime().nullable().optional(),
	notes: z.string().nullable().optional(),
	isPrimary: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class DiagnosisQueryDto extends createZodDto(DiagnosisQuerySchema) {}

export class CreateDiagnosisDto extends createZodDto(CreateDiagnosisSchema) {}

export class DiagnosisResponseDto extends createZodDto(ApiSuccessResponseSchema(DiagnosisSchema)) {}

export class DiagnosisListResponseDto extends createZodDto(ApiSuccessResponseSchema(DiagnosisSchema.array())) {}
