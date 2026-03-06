import { oc } from "@orpc/contract"
import { z } from "zod"

import { CreateTicketSchema, TicketIdSchema, TicketSchema } from "./tickets.schema.js"

export const ticketContract = {
	/**
	 * List all tickets
	 * GET /tickets
	 */
	list: oc
		.route({
			method: "GET",
			path: "/tickets",
			summary: "List all tickets",
			description: "Retrieve all support tickets",
			tags: ["Tickets"],
			spec: spec => ({ ...spec, security: [] }),
		})
		.output(z.array(TicketSchema)),

	/**
	 * Get a single ticket by ID
	 * GET /tickets/{id}
	 */
	get: oc
		.route({
			method: "GET",
			path: "/tickets/{id}",
			summary: "Get ticket by ID",
			description: "Retrieve a single support ticket by its ID",
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
