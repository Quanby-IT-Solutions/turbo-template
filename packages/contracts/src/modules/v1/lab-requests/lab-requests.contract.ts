import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const LabRequestQuerySchema = PaginationSchema.extend({
	patientId: z.string().uuid().optional(),
	organizationId: z.string().uuid().optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED", "ON_HOLD"]).optional(),
})

export const CreateLabRequestSchema = z.object({
	patientId: z.string().uuid(),
	organizationId: z.string().uuid(),
	doctorId: z.string().uuid().optional(),
	note: z.string().optional(),
	requestedTests: z.string().optional(), // JSON string
	instructions: z.string().optional(),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
})

export const LabRequestSchema = z.object({
	id: z.string().uuid(),
	patientId: z.string().uuid(),
	organizationId: z.string().uuid(),
	doctorId: z.string().uuid().nullable().optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED", "ON_HOLD"]),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
	requestedTests: z.string().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class LabRequestQueryDto extends createZodDto(LabRequestQuerySchema) {}

export class CreateLabRequestDto extends createZodDto(CreateLabRequestSchema) {}

export class LabRequestResponseDto extends createZodDto(ApiSuccessResponseSchema(LabRequestSchema)) {}

export class LabRequestListResponseDto extends createZodDto(ApiSuccessResponseSchema(LabRequestSchema.array())) {}
