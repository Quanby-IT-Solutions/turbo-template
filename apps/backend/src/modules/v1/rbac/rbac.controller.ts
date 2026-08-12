import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"

import { RbacAdminService } from "./rbac-admin.service"

/**
 * The user to attribute a privileged mutation to (AZ-4).
 *
 * Null rather than throwing: every route here already requires a permission,
 * so an absent session means the guard let something through and the safer
 * outcome is an entry recording that the actor was unknown, not a lost audit
 * row.
 */
function actorId(session?: UserSession): string | null {
	return session?.user?.id ?? null
}

@Controller()
export class RbacController {
	constructor(private readonly rbacAdminService: RbacAdminService) {}

	// ---------------------------------------------------------------- roles
	@RequirePermissions("users:read")
	@Implement(v1.rbac.roles.list)
	async listRoles() {
		return implement(v1.rbac.roles.list).handler(async () => {
			return this.rbacAdminService.listRoles()
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.create)
	async createRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.create).handler(async ({ input }) => {
			return this.rbacAdminService.createRole(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.update)
	async updateRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.update).handler(async ({ input }) => {
			return this.rbacAdminService.updateRole(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.setPermissions)
	async setRolePermissions(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.setPermissions).handler(async ({ input }) => {
			return this.rbacAdminService.setRolePermissions(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.delete)
	async deleteRole(@Session() session?: UserSession) {
		return implement(v1.rbac.roles.delete).handler(async ({ input }) => {
			return this.rbacAdminService.deleteRole(input.id, actorId(session))
		})
	}

	// ---------------------------------------------------------- permissions
	@RequirePermissions("users:read")
	@Implement(v1.rbac.permissions.list)
	async listPermissions() {
		return implement(v1.rbac.permissions.list).handler(async () => {
			return this.rbacAdminService.listPermissions()
		})
	}

	// ---------------------------------------------------------------- users
	@RequirePermissions("users:read")
	@Implement(v1.rbac.users.list)
	async listUsers() {
		return implement(v1.rbac.users.list).handler(async () => {
			return this.rbacAdminService.listUsers()
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.users.assignRole)
	async assignRole(@Session() session?: UserSession) {
		return implement(v1.rbac.users.assignRole).handler(async ({ input }) => {
			return this.rbacAdminService.assignUserRole(input, actorId(session))
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.users.removeRole)
	async removeRole(@Session() session?: UserSession) {
		return implement(v1.rbac.users.removeRole).handler(async ({ input }) => {
			return this.rbacAdminService.removeUserRole(input, actorId(session))
		})
	}

	// ------------------------------------------------------------ audit log
	// Read-only by design (AZ-4 / F-17). There is deliberately no update or
	// delete route for `audit_log`, and none may be added.
	@RequirePermissions("users:read")
	@Implement(v1.rbac.audit.list)
	async listAuditLog() {
		return implement(v1.rbac.audit.list).handler(async ({ input }) => {
			return this.rbacAdminService.listAuditLog(input)
		})
	}
}
