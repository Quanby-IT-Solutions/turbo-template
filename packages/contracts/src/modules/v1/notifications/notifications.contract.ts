import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

export const NotificationQuerySchema = PaginationSchema.extend({
	isRead: z.boolean().optional(),
	type: z.string().optional(),
})

export const NotificationSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	type: z.string(),
	title: z.string(),
	message: z.string(),
	relatedId: z.string().nullable().optional(),
	relatedType: z.string().nullable().optional(),
	actionUrl: z.string().nullable().optional(),
	isRead: z.boolean(),
	isArchived: z.boolean(),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
	readAt: z.string().datetime().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

// ============================================================================
// DTOs
// ============================================================================

export class NotificationQueryDto extends createZodDto(NotificationQuerySchema) {}

export class NotificationResponseDto extends createZodDto(ApiSuccessResponseSchema(NotificationSchema)) {}

export class NotificationListResponseDto extends createZodDto(ApiSuccessResponseSchema(NotificationSchema.array())) {}
