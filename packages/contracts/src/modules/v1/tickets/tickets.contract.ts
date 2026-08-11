import { oc } from "@orpc/contract"
import { z } from "zod"

import { CreateTicketSchema, TicketIdSchema, TicketSchema } from "./tickets.schema.js"

export const ticketContract = {
	/**
	 * List all tickets
	 * GET /tickets
	 *
	 * Requires `users:read` (enforced by the backend RbacGuard). Reporter PII
	 * (name, email, subject, concern) is staff-only.
	 */
	list: oc
		.route({
			method: "GET",
			path: "/tickets",
			summary: "List all tickets",
			description: "Retrieve all support tickets. Requires `users:read`.",
			tags: ["Tickets"],
		})
		.output(z.array(TicketSchema)),

	/**
	 * Get a single ticket by ID
	 * GET /tickets/{id}
	 *
	 * Requires `users:read` (enforced by the backend RbacGuard).
	 */
	get: oc
		.route({
			method: "GET",
			path: "/tickets/{id}",
			summary: "Get ticket by ID",
			description: "Retrieve a single support ticket by its ID. Requires `users:read`.",
			tags: ["Tickets"],
		})
		.input(TicketIdSchema)
		.output(TicketSchema),

	/**
	 * Submit a new ticket
	 * POST /tickets
	 */
	submit: oc
		.route({
			method: "POST",
			path: "/tickets",
			summary: "Submit ticket",
			description: "Submit a new support ticket",
			tags: ["Tickets"],
			spec: spec => ({ ...spec, security: [] }),
		})
		.input(CreateTicketSchema)
		.output(TicketSchema),
}
