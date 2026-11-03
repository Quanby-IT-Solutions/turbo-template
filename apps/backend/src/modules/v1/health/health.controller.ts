import { Controller } from "@nestjs/common"
import { SkipThrottle } from "@nestjs/throttler"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { HealthService } from "./health.service"

@Controller()
export class HealthController {
	constructor(private readonly service: HealthService) {}

	@AllowAnonymous()
	// Load balancers poll this continuously, and a 429 here reads as "instance
	// unhealthy". Skips the default throttler; `strict` is opt-in and never
	// applies here.
	@SkipThrottle()
	@Implement(v1.health.check)
	async check() {
		return implement(v1.health.check).handler(async () => {
			return this.service.check()
		})
	}
}
