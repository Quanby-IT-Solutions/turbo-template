import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const OrganizationQuerySchema = PaginationSchema.extend({
	search: z.string().optional(),
	isActive: z.boolean().optional(),
})

export const OrganizationSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable().optional(),
	address: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	website: z.string().nullable().optional(),
	isActive: z.boolean(),
	subscriptionTier: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE", "T"]),
	approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class OrganizationQueryDto extends createZodDto(OrganizationQuerySchema) {}

export class OrganizationResponseDto extends createZodDto(ApiSuccessResponseSchema(OrganizationSchema)) {}

export class OrganizationListResponseDto extends createZodDto(ApiSuccessResponseSchema(OrganizationSchema.array())) {}
