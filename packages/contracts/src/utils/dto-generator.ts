import { createZodDto, type ZodDto } from "nestjs-zod"
import { type z } from "zod"

/**
 * Creates a NestJS DTO class from a Zod schema with automatic Swagger documentation.
 * Sets the class name for better debugging and documentation.
 *
 * @example
 * ```ts
 * export class CreateTodoDto extends createDto(CreateTodoSchema, "CreateTodoDto") {}
 * ```
 */
export function createDto<T extends z.ZodTypeAny>(schema: T, className: string): ZodDto<T, false> {
	const DtoClass = createZodDto(schema)
	// Set the class name for better debugging and documentation
	Object.defineProperty(DtoClass, "name", { value: className })
	return DtoClass
}
