import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const DoctorQuerySchema = PaginationSchema.extend({
	search: z.string().optional(),
	organizationId: z.string().uuid().optional(),
})

export const DoctorInfoSchema = z.object({
	firstName: z.string(),
	middleName: z.string().nullable().optional(),
	lastName: z.string(),
	specialization: z.string(),
	qualifications: z.string(),
	experience: z.number(),
	contactNumber: z.string(),
	approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
	approvalStatusUpdatedAt: z.string().datetime().nullable().optional(),
	approvalRejectionReason: z.string().nullable().optional(),
	prcIdImage: z.string().nullable().optional(),
	ptrIdImage: z.string().nullable().optional(),
	medicalLicenseImage: z.string().nullable().optional(),
})

export const DoctorSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	organizationId: z.string().uuid().nullable().optional(),
	organization: z
		.object({
			id: z.string().uuid(),
			name: z.string(),
		})
		.nullable()
		.optional(),
	doctorInfo: DoctorInfoSchema,
	createdAt: z.string().datetime(),
})

export const DoctorListResponseSchema = z.object({
	items: DoctorSchema.array(),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
})

// ============================================================================
// DTOs
// ============================================================================

export class DoctorQueryDto extends createZodDto(DoctorQuerySchema) {}

export class DoctorResponseDto extends createZodDto(ApiSuccessResponseSchema(DoctorSchema)) {}

export class DoctorListResponseDto extends createZodDto(ApiSuccessResponseSchema(DoctorListResponseSchema)) {}
