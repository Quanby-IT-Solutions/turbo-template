import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateTodoSchema,
	TodoIdSchema,
	TodoSchema,
	UpdateTodoRequestSchema,
} from "./todos.schema.js"

export const todoContract = {
	/**
	 * List all todos
	 * GET /todos
	 */
	list: oc
		.route({
			method: "GET",
			path: "/todos",
			summary: "List all todos",
			description: "Retrieve all todo items",
			tags: ["Todos"],
			spec: spec => ({ ...spec, security: [] }),
		})
		.output(z.array(TodoSchema)),

	/**
	 * Get a single todo by ID
	 * GET /todos/{id}
	 */
	get: oc
		.route({
			method: "GET",
			path: "/todos/{id}",
			summary: "Get todo by ID",
			description: "Retrieve a single todo item by its ID",
			tags: ["Todos"],
		})
		.input(TodoIdSchema)
		.output(TodoSchema),

	/**
	 * Create a new todo
	 * POST /todos
	 */
	create: oc
		.route({
			method: "POST",
			path: "/todos",
			summary: "Create todo",
			description: "Create a new todo item",
			tags: ["Todos"],
		})
		.input(CreateTodoSchema)
		.output(TodoSchema),

	/**
	 * Update an existing todo
	 * PUT /todos/{id}
	 */
	update: oc
		.route({
			method: "PUT",
			path: "/todos/{id}",
			summary: "Update todo",
			description: "Update an existing todo item",
			tags: ["Todos"],
		})
		.input(UpdateTodoRequestSchema)
		.output(TodoSchema),

	/**
	 * Delete a todo by ID
	 * DELETE /todos/{id}
	 */
	delete: oc
		.route({
			method: "DELETE",
			path: "/todos/{id}",
			summary: "Delete todo",
			description: "Delete a todo item by its ID",
			tags: ["Todos"],
		})
		.input(TodoIdSchema)
		.output(z.object({ success: z.boolean(), id: z.number() })),
}
