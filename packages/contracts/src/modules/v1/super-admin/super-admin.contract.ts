import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const SuperAdminQuerySchema = PaginationSchema.extend({
	search: z.string().optional(),
	role: z.enum(["DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN", "ORGANIZATION"]).optional(),
})

// ============================================================================
// DTOs
// ============================================================================

export class SuperAdminQueryDto extends createZodDto(SuperAdminQuerySchema) {}
