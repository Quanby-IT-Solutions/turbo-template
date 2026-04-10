import { oc } from "@orpc/contract"
import { z } from "zod"

import { CreateTodoSchema, TodoIdSchema, TodoSchema } from "./todos.schema.js"

export const todoContract = {
	/**
	 * List all todos
	 * GET /v1/todos
	 */
	list: oc
		.route({
			method: "GET",
			path: "/v1/todos",
			summary: "List all todos",
			description: "Retrieve all todo items",
			tags: ["Todos"],
			spec: spec => ({ ...spec, security: [] }),
		})
		.output(z.array(TodoSchema)),

	/**
	 * Get a single todo by ID
	 * GET /v1/todos/{id}
	 */
	get: oc
		.route({
			method: "GET",
			path: "/v1/todos/{id}",
			summary: "Get todo by ID",
			description: "Retrieve a single todo item by its ID",
			tags: ["Todos"],
		})
		.input(TodoIdSchema)
		.output(TodoSchema),

	/**
	 * Create a new todo
	 * POST /v1/todos
	 */
	create: oc
		.route({
			method: "POST",
			path: "/v1/todos",
			summary: "Create todo",
			description: "Create a new todo item",
			tags: ["Todos"],
		})
		.input(CreateTodoSchema)
		.output(TodoSchema),

	/**
	 * Update an existing todo
	 * PUT /v1/todos/{id}
	 */
	update: oc
		.route({
			method: "PUT",
			path: "/v1/todos/{id}",
			summary: "Update todo",
			description: "Update an existing todo item",
			tags: ["Todos"],
		})
		.input(
			z.object({
				id: z.coerce.number().int().min(1),
				title: z.string().min(1).max(200).optional(),
				description: z.string().max(1000).optional(),
				completed: z.boolean().optional(),
			}),
		)
		.output(TodoSchema),

	/**
	 * Delete a todo by ID
	 * DELETE /v1/todos/{id}
	 */
	delete: oc
		.route({
			method: "DELETE",
			path: "/v1/todos/{id}",
			summary: "Delete todo",
			description: "Delete a todo item by its ID",
			tags: ["Todos"],
		})
		.input(TodoIdSchema)
		.output(z.object({ success: z.boolean(), id: z.number() })),
}
