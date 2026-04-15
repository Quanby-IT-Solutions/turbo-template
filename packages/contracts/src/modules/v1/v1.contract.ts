import { oc } from "@orpc/contract"

import { v1Example } from "./examples/v1.example.js"
import { healthContract } from "./health/health.contract.js"
import { ticketContract } from "./tickets/tickets.contract.js"

/**
 * V1 contract router (versioned paths: /v1/todos, /v1/health, /v1/tickets)
 * Assembles all v1 feature contracts and applies the /v1 prefix
 */
export const v1Contract = oc.prefix("/v1").router(
	oc.router({
		health: healthContract,
		example: v1Example,
		ticket: ticketContract,
	})
)

export type V1Contract = typeof v1Contract
