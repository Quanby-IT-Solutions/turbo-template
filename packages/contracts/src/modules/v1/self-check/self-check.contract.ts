import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const HealthScanSchema = z.object({
	id: z.string().uuid(),
	consultationId: z.string().uuid(),
	bloodPressure: z.string().nullable().optional(),
	heartRate: z.number().nullable().optional(),
	spO2: z.number().nullable().optional(),
	stressLevel: z.number().nullable().optional(),
	generalWellness: z.number().nullable().optional(),
	generalRisk: z.number().nullable().optional(),
})

// ============================================================================
// DTOs
// ============================================================================

export class HealthScanResponseDto extends createZodDto(ApiSuccessResponseSchema(HealthScanSchema)) {}
