import { type z } from "zod"

/**
 * Type helper to extract the instance type from a DTO class
 * @example
 * ```ts
 * export class CreateTodoDto extends createZodDto(CreateTodoSchema) {}
 * export type CreateTodoDtoType = DtoType<typeof CreateTodoDto>
 * ```
 */
export type DtoType<T extends abstract new (...args: unknown[]) => unknown> = InstanceType<T>

/**
 * Type helper to infer the DTO type directly from a Zod schema
 * This is equivalent to z.infer but provides better semantic meaning for DTOs
 * @example
 * ```ts
 * export type CreateTodoDtoType = DtoFromSchema<typeof CreateTodoSchema>
 * ```
 */
export type DtoFromSchema<T extends z.ZodTypeAny> = z.infer<T>

/**
 * Recursively transforms non-JSON-safe types to JSON-safe equivalents.
 * - Date → string (ISO format)
 * - BigInt → string
 * - Buffer → string (base64)
 */
export type Serialize<T> = T extends Date
	? string
	: T extends bigint
		? string
		: T extends Buffer
			? string
			: T extends Array<infer U>
				? Array<Serialize<U>>
				: T extends object
					? { [K in keyof T]: Serialize<T[K]> }
					: T

/**
 * Recursively serializes an object, converting non-JSON-safe types to strings.
 * Handles: Date → ISO string, BigInt → string, Buffer → base64, nested objects/arrays.
 *
 * @example
 * ```ts
 * const todo = await db.select().from(todos).where(eq(todos.id, 1))
 * return ok(todo) // serialize is called internally by ok()
 * ```
 */
export function serialize<T>(value: T): Serialize<T> {
	if (value === null || value === undefined) {
		return value as Serialize<T>
	}

	if (value instanceof Date) {
		return value.toISOString() as Serialize<T>
	}

	if (typeof value === "bigint") {
		return value.toString() as Serialize<T>
	}

	if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
		return value.toString("base64") as Serialize<T>
	}

	if (Array.isArray(value)) {
		return value.map(item => serialize(item)) as Serialize<T>
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {}
		for (const key of Object.keys(value as Record<string, unknown>)) {
			result[key] = serialize((value as Record<string, unknown>)[key])
		}
		return result as Serialize<T>
	}

	return value as Serialize<T>
}
