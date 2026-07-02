import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"
import { StrictThrottle } from "@/shared/decorators/strict-throttle.decorator"

import { RbacAdminService } from "./rbac-admin.service"

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
	async createRole() {
		return implement(v1.rbac.roles.create).handler(async ({ input }) => {
			return this.rbacAdminService.createRole(input)
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.update)
	async updateRole() {
		return implement(v1.rbac.roles.update).handler(async ({ input }) => {
			return this.rbacAdminService.updateRole(input)
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.setPermissions)
	async setRolePermissions() {
		return implement(v1.rbac.roles.setPermissions).handler(async ({ input }) => {
			return this.rbacAdminService.setRolePermissions(input)
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.roles.delete)
	async deleteRole() {
		return implement(v1.rbac.roles.delete).handler(async ({ input }) => {
			return this.rbacAdminService.deleteRole(input.id)
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
	async assignRole() {
		return implement(v1.rbac.users.assignRole).handler(async ({ input }) => {
			return this.rbacAdminService.assignUserRole(input)
		})
	}

	@StrictThrottle()
	@RequirePermissions("users:manage")
	@Implement(v1.rbac.users.removeRole)
	async removeRole() {
		return implement(v1.rbac.users.removeRole).handler(async ({ input }) => {
			return this.rbacAdminService.removeUserRole(input)
		})
	}
}
