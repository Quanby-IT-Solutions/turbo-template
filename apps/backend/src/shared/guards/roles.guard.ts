import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import type { Role } from "@repo/db/schema"

import { ROLES_KEY } from "../decorators/roles.decorator.js"

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {
		console.error("🔧 RolesGuard instantiated")
	}

	canActivate(context: ExecutionContext): boolean {
		process.stderr.write(`\n🛡️🛡️ ROLES GUARD CALLED\n`)
		console.error("🛡️🛡️ ROLES GUARD CALLED")
		
		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!requiredRoles) {
			console.error("✅ No roles required, allowing access")
			return true
		}

		const request = context.switchToHttp().getRequest()
		const { user } = request

		console.error("🔍 RolesGuard checking user:", {
			hasUser: !!user,
			userRole: user?.role,
			requiredRoles,
		})

		if (!user) {
			process.stderr.write(`\n❌ RolesGuard: User not authenticated\n`)
			console.error("❌ RolesGuard: User not authenticated")
			throw new ForbiddenException("User not authenticated")
		}

		const hasRole = requiredRoles.some(role => user.role === role)

		if (!hasRole) {
			throw new ForbiddenException("Insufficient permissions")
		}

		return true
	}
}
