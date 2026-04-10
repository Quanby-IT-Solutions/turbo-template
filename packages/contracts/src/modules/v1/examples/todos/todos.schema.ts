import { z } from "zod"

// ============================================================================
// SCHEMAS
// ============================================================================
const baseToDoSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1, "Title is required").max(255, "Title too long"),
	completed: z.boolean().default(false),
	authorId: z.string(),
	createdAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? new Date(val) : val)),
	updatedAt: z
		.union([z.date(), z.string()])
		.transform(val => (typeof val === "string" ? new Date(val) : val)),
})

export const TodoSchema = baseToDoSchema

export const TodoIdSchema = z.object({
	id: z.coerce.number().int().positive(),
})

export const CreateTodoSchema = TodoSchema.pick({
	title: true,
	completed: true,
})

export const UpdateTodoSchema = TodoSchema.pick({
	title: true,
	completed: true,
}).partial()

/** Full update route input: id from path + optional title/completed */
export const UpdateTodoRequestSchema = TodoIdSchema.extend(UpdateTodoSchema.shape)

// ============================================================================
// TYPES
// ============================================================================
export type Todo = z.infer<typeof TodoSchema>
export type TodoIdInput = z.infer<typeof TodoIdSchema>
export type CreateTodoInput = z.infer<typeof CreateTodoSchema>
export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>
export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequestSchema>
