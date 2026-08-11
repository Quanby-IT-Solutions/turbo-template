import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

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
	async submitTicket() {
		return implement(v1.ticket.submit).handler(async ({ input }) => {
			return this.ticketsService.submit({ payload: input })
		})
	}
}
