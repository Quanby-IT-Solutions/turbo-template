import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const SendEmailSchema = z.object({
	to: z.string().email(),
	subject: z.string(),
	body: z.string(),
	html: z.string().optional(),
})

// ============================================================================
// DTOs
// ============================================================================

export class SendEmailDto extends createZodDto(SendEmailSchema) {}

export class EmailResponseDto extends createZodDto(ApiSuccessResponseSchema(z.object({ success: z.boolean() }))) {}
