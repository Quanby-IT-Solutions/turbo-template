import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"

import { TicketsService } from "./tickets.service"

@Controller()
export class TicketsController {
	constructor(private readonly ticketsService: TicketsService) {}

	@RequirePermissions("users:read")
	@Implement(v1.ticket.list)
	async listTickets() {
		return implement(v1.ticket.list).handler(async () => {
			return this.ticketsService.findAll()
		})
	}

	@RequirePermissions("users:read")
	@Implement(v1.ticket.get)
	async getTicket() {
		return implement(v1.ticket.get).handler(async ({ input }) => {
			return this.ticketsService.findOne({ id: input.id })
		})
	}

	@StrictThrottle()
	@Implement(v1.ticket.submit)
	async submitTicket(@Session() session?: UserSession) {
		return implement(v1.ticket.submit).handler(async ({ input }) => {
			// AZ-3 / F-30: attribute the submission. Optional so the route keeps
			// working if it is ever opened to anonymous reporters.
			return this.ticketsService.submit({
				payload: input,
				authorId: session?.user?.id ?? null,
			})
		})
	}
}
