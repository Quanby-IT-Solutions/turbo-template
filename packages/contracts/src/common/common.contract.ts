import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { serialize, type Serialize } from "../utils/types.js"

// ============================================================================
// SCHEMAS
// ============================================================================
export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.literal(true),
		data: dataSchema,
		message: z.string().optional(),
	})

export const ApiErrorResponseSchema = z.object({
	success: z.literal(false),
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.any().optional(),
	}),
	timestamp: z.iso.datetime(),
})

export const PaginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ApiSuccessResponse<T> = z.infer<
	ReturnType<typeof ApiSuccessResponseSchema<z.ZodType<T>>>
>
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>
export type Pagination = z.infer<typeof PaginationSchema>

// ============================================================================
// RESPONSE HELPERS
// ============================================================================
/**
 * Creates a success response with proper literal typing.
 * Does NOT serialize data - use `ok()` if you need serialization.
 *
 * @example
 * ```ts
 * return success(alreadySerializedData)
 * ```
 */
export function success<T>(data: T, message?: string) {
	return message ? { success: true as const, data, message } : { success: true as const, data }
}

/**
 * Creates a success response AND serializes the data (Date → string, etc.).
 * This is the recommended helper for controller responses.
 *
 * @example
 * ```ts
 * return ok(todo)                    // Single item
 * return ok(todos)                   // Array
 * return ok(todo, "Created!")        // With message
 * ```
 */
export function ok<T>(data: T, message?: string) {
	const serialized = serialize(data)
	return message
		? { success: true as const, data: serialized, message }
		: { success: true as const, data: serialized }
}

/** Pagination metadata for list responses */
export interface PaginationMeta {
	page: number
	limit: number
	total: number
	totalPages: number
}

/**
 * Creates a paginated success response with serialization.
 *
 * @example
 * ```ts
 * const todos = await db.select().from(todosTable).limit(limit).offset((page - 1) * limit)
 * const total = await db.select({ count: count() }).from(todosTable)
 * return paginated(todos, { page, limit, total: total[0].count })
 * ```
 */
export function paginated<T>(data: T[], meta: { page: number; limit: number; total: number }) {
	return {
		success: true as const,
		data: serialize(data) as Serialize<T>[],
		meta: {
			...meta,
			totalPages: Math.ceil(meta.total / meta.limit),
		},
	}
}

// ============================================================================
// DTOs
// ============================================================================
export class ApiErrorResponseDto extends createZodDto(ApiErrorResponseSchema) {}

export class PaginationDto extends createZodDto(PaginationSchema) {}

/**
 * Convenience helper to create a DTO class for a standard
 * success response envelope wrapping the provided schema.
 *
 * @example
 * ```ts
 * export class TodoListResponseDto extends ApiSuccessDto(z.array(TodoSchema), "TodoListResponseDto") {}
 * ```
 */
export const ApiSuccessDto = <T extends z.ZodTypeAny>(schema: T, className: string) => {
	const DtoClass = createZodDto(ApiSuccessResponseSchema(schema))
	// Set the class name for better debugging and documentation
	Object.defineProperty(DtoClass, "name", { value: className })
	return DtoClass
}
