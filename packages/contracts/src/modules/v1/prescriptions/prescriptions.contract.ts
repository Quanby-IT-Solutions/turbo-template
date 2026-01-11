import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const PrescriptionQuerySchema = PaginationSchema.extend({
	patientId: z.string().uuid().optional(),
	doctorId: z.string().uuid().optional(),
	isActive: z.boolean().optional(),
})

export const CreatePrescriptionSchema = z.object({
	patientId: z.string().uuid(),
	doctorId: z.string().uuid(),
	consultationId: z.string().uuid().optional(),
	medicationName: z.string(),
	dosage: z.string(),
	frequency: z.string(),
	duration: z.string(),
	instructions: z.string().optional(),
	quantity: z.number().optional(),
	refills: z.number().optional(),
	expiresAt: z.string().datetime().optional(),
	notes: z.string().optional(),
})

export const PrescriptionSchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid(),
	consultationId: z.string().uuid().nullable().optional(),
	medicationName: z.string(),
	dosage: z.string(),
	frequency: z.string(),
	duration: z.string(),
	instructions: z.string().nullable().optional(),
	quantity: z.number().nullable().optional(),
	refills: z.number(),
	isActive: z.boolean(),
	prescribedAt: z.string().datetime(),
	expiresAt: z.string().datetime().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class PrescriptionQueryDto extends createZodDto(PrescriptionQuerySchema) {}

export class CreatePrescriptionDto extends createZodDto(CreatePrescriptionSchema) {}

export class PrescriptionResponseDto extends createZodDto(ApiSuccessResponseSchema(PrescriptionSchema)) {}

export class PrescriptionListResponseDto extends createZodDto(ApiSuccessResponseSchema(PrescriptionSchema.array())) {}
