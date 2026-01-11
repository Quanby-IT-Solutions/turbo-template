import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const FaceScanResultSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
	results: z.record(z.string(), z.any()), // JSON object with string keys
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class FaceScanResultResponseDto extends createZodDto(ApiSuccessResponseSchema(FaceScanResultSchema)) {}

export class FaceScanResultListResponseDto extends createZodDto(ApiSuccessResponseSchema(FaceScanResultSchema.array())) {}
