import { Controller, UnauthorizedException } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { RbacService } from "@/common/rbac/rbac.service"
import { v1 } from "@/config/api-versions.config"

@Controller()
export class MeController {
	constructor(private readonly rbacService: RbacService) {}

	@Implement(v1.me.permissions)
	async getPermissions(@Session() session?: UserSession) {
		return implement(v1.me.permissions).handler(async () => {
			const userId = session?.user?.id
			if (!userId) {
				throw new UnauthorizedException("Authentication required")
			}

			return this.rbacService.getUserAccess(userId)
		})
	}
}
