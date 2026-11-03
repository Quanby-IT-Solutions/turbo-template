import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"

import { HealthService } from "./health.service"

@Controller()
export class HealthController {
	constructor(private readonly service: HealthService) {}

	@AllowAnonymous()
	@Implement(v1.health.check)
	async check() {
		return implement(v1.health.check).handler(async () => {
			return this.service.check()
		})
	}
}
