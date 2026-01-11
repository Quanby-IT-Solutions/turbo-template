import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const PatientQuerySchema = PaginationSchema.extend({
	search: z.string().optional(),
})

export const PatientInfoSchema = z.object({
	firstName: z.string(),
	middleName: z.string().nullable().optional(),
	lastName: z.string(),
	gender: z.enum(["MALE", "FEMALE", "OTHER"]),
	dateOfBirth: z.string().datetime(),
	contactNumber: z.string(),
	address: z.string(),
	weight: z.number(),
	height: z.number(),
	bloodType: z.string(),
	medicalHistory: z.string().nullable().optional(),
	allergies: z.string().nullable().optional(),
	medications: z.string().nullable().optional(),
	philHealthId: z.string().nullable().optional(),
	verificationStatus: z.enum(["NOT_VERIFIED", "PENDING", "VERIFIED", "REJECTED"]),
})

export const PatientSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	patientInfo: PatientInfoSchema,
	createdAt: z.string().datetime(),
})

export const PatientListResponseSchema = z.object({
	items: PatientSchema.array(),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// DTOs
// ============================================================================

export class PatientQueryDto extends createZodDto(PatientQuerySchema) {}

export class PatientResponseDto extends createZodDto(ApiSuccessResponseSchema(PatientSchema)) {}

export class PatientListResponseDto extends createZodDto(ApiSuccessResponseSchema(PatientListResponseSchema)) {}
