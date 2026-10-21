import {
	ForbiddenException,
	Injectable,
	UnauthorizedException,
	type CanActivate,
	type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { fromNodeHeaders } from "better-auth/node"

import { getAuth } from "@repo/auth"

import {
	resolveRequestSession,
	type RequestSession,
	type RequestWithSession,
} from "./resolve-request-session"

/**
 * Metadata keys set by the library decorators in `@thallesp/nestjs-better-auth`.
 * Kept as the same strings so `@AllowAnonymous` / `@Public`, `@OptionalAuth`
 * and the role decorators keep their meaning.
 */
const PUBLIC_KEY = "PUBLIC"
const OPTIONAL_KEY = "OPTIONAL"
const ROLES_KEY = "ROLES"
const ORG_ROLES_KEY = "ORG_ROLES"
const USER_PERMISSION_KEY = "USER_HAS_PERMISSION"
const MEMBER_PERMISSION_KEY = "MEMBER_HAS_PERMISSION"

interface UserPermissionCheck {
	permission?: unknown
	permissions?: unknown
	userId?: string
	role?: string
}

interface MemberPermissionCheck {
	permissions: unknown
}

interface AuthApi {
	getActiveMemberRole?: (args: { headers: Headers }) => Promise<{ role?: string | string[] } | null>
	getActiveMember?: (args: { headers: Headers }) => Promise<{ role?: string | string[] } | null>
	userHasPermission?: (args: {
		body: Record<string, unknown>
		headers: Headers
	}) => Promise<{ success?: boolean } | null>
	hasPermission?: (args: {
		body: { permissions: unknown }
		headers: Headers
	}) => Promise<{ success?: boolean } | null>
}

const unauthorized = () =>
	new UnauthorizedException({
		code: "UNAUTHORIZED",
		message: "Unauthorized",
	})

const forbidden = () =>
	new ForbiddenException({
		code: "FORBIDDEN",
		message: "Insufficient permissions",
	})

/**
 * Global auth guard. Replaces the library `AuthGuard` so a session already
 * resolved earlier in the same request is reused.
 *
 * HTTP behavior matches that guard: the session and user are stored on the
 * request, then `@AllowAnonymous` / `@Public`, `@OptionalAuth`, `@Roles`,
 * `@OrgRoles`, `@UserHasPermission` and `@MemberHasPermission` are applied in
 * that order. This API has no GraphQL resolvers and no WebSocket gateways, so
 * those context types are rejected.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (context.getType() !== "http") {
			throw unauthorized()
		}

		const request = context.switchToHttp().getRequest<RequestWithSession>()
		const session = await resolveRequestSession(request)
		const handler = [context.getHandler(), context.getClass()]

		if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, handler)) {
			return true
		}

		const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_KEY, handler)
		if (!session && optional) {
			return true
		}
		if (!session) {
			throw unauthorized()
		}

		const headers = fromNodeHeaders(request.headers ?? {})
		const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, handler)
		if (
			requiredRoles &&
			requiredRoles.length > 0 &&
			!this.matchesRole(session.user?.role, requiredRoles)
		) {
			throw forbidden()
		}

		const requiredOrgRoles = this.reflector.getAllAndOverride<string[]>(ORG_ROLES_KEY, handler)
		if (
			requiredOrgRoles &&
			requiredOrgRoles.length > 0 &&
			!(await this.matchesOrgRole(session, headers, requiredOrgRoles))
		) {
			throw forbidden()
		}

		const userPermission = this.reflector.getAllAndOverride<UserPermissionCheck>(
			USER_PERMISSION_KEY,
			handler
		)
		if (userPermission && !(await this.userHasPermission(session, headers, userPermission))) {
			throw forbidden()
		}

		const memberPermission = this.reflector.getAllAndOverride<MemberPermissionCheck>(
			MEMBER_PERMISSION_KEY,
			handler
		)
		if (memberPermission && !(await this.memberHasPermission(session, headers, memberPermission))) {
			throw forbidden()
		}

		return true
	}

	private matchesRole(role: string | string[] | undefined, requiredRoles: string[]): boolean {
		if (!role) return false
		if (Array.isArray(role)) {
			return role.some(entry => requiredRoles.includes(entry))
		}
		if (typeof role === "string") {
			return role.split(",").some(entry => requiredRoles.includes(entry.trim()))
		}
		return false
	}

	private async matchesOrgRole(
		session: RequestSession,
		headers: Headers,
		requiredRoles: string[]
	): Promise<boolean> {
		if (!session.session?.activeOrganizationId) {
			return false
		}
		try {
			const api = getAuth().api as AuthApi
			let role: string | string[] | undefined
			if (typeof api.getActiveMemberRole === "function") {
				role = (await api.getActiveMemberRole({ headers }))?.role
			} else if (typeof api.getActiveMember === "function") {
				role = (await api.getActiveMember({ headers }))?.role
			}
			return this.matchesRole(role, requiredRoles)
		} catch {
			return false
		}
	}

	private async userHasPermission(
		session: RequestSession,
		headers: Headers,
		permissionCheck: UserPermissionCheck
	): Promise<boolean> {
		try {
			const api = getAuth().api as AuthApi
			if (typeof api.userHasPermission !== "function") {
				return false
			}
			const body: Record<string, unknown> = {}
			if (permissionCheck.userId) {
				body.userId = permissionCheck.userId
			} else if (session.user?.id) {
				body.userId = session.user.id
			}
			if (permissionCheck.role) {
				body.role = permissionCheck.role
			}
			if (permissionCheck.permission) {
				body.permissions = permissionCheck.permission
			} else if (permissionCheck.permissions) {
				body.permissions = permissionCheck.permissions
			}
			const result = await api.userHasPermission({ body, headers })
			return Boolean(result?.success)
		} catch {
			return false
		}
	}

	private async memberHasPermission(
		session: RequestSession,
		headers: Headers,
		permissionCheck: MemberPermissionCheck
	): Promise<boolean> {
		if (!session.session?.activeOrganizationId) {
			return false
		}
		try {
			const api = getAuth().api as AuthApi
			if (typeof api.hasPermission !== "function") {
				return false
			}
			const result = await api.hasPermission({
				body: { permissions: permissionCheck.permissions },
				headers,
			})
			return Boolean(result?.success)
		} catch {
			return false
		}
	}
}
