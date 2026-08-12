import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { OptionalAuth, Session, type UserSession } from "@thallesp/nestjs-better-auth"

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
	// Submission is open to anonymous callers, and must stay that way: AZ-1 gates
	// ticket *reads* on `users:read`, not writes. The global AuthGuard protects
	// every route by default, so without this the support form 401s for exactly
	// the people most likely to need it. The contract already declares the route
	// unauthenticated (`security: []`); that is OpenAPI metadata and does not
	// reach the guard, so the opt-out has to be stated here too.
	//
	// `OptionalAuth` rather than `AllowAnonymous`: both leave the session
	// resolved (the guard populates it before either check), but this one states
	// the actual rule — authentication is optional here, not absent — so a signed
	// -in reporter still gets `authorId` recorded per AZ-3.
	@OptionalAuth()
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
