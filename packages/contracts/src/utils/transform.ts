/**
 * Utilities for transforming API responses to match runtime types
 */

/**
 * Transform a single todo from API response (with string dates) to runtime type (with Date objects)
 */
export function transformTodo<T extends { createdAt: string | Date }>(todo: T) {
	return {
		...todo,
		createdAt: typeof todo.createdAt === "string" ? new Date(todo.createdAt) : todo.createdAt,
	} as Omit<T, "createdAt"> & { createdAt: Date }
}

/**
 * Transform an array of todos from API response to runtime types
 */
export function transformTodos<T extends { createdAt: string | Date }>(todos: T[]) {
	return todos.map(transformTodo)
}

/**
 * Generic date field transformer for any entity
 * Useful for entities with multiple date fields
 */
export function transformDateFields<
	T extends Record<string, string | Date | unknown>,
	K extends keyof T,
>(obj: T, dateFields: K[]) {
	const result = { ...obj }
	for (const field of dateFields) {
		const value = result[field]
		if (typeof value === "string") {
			result[field] = new Date(value) as T[K]
		}
	}
	return result
}
