import {
	ForbiddenException,
	Injectable,
	Logger,
	UnauthorizedException,
	type CanActivate,
	type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { IncomingHttpHeaders } from "http"
import { fromNodeHeaders } from "better-auth/node"

import { getAuth } from "@repo/auth"

import { RbacService } from "@/common/rbac/rbac.service"
import { env } from "@/config/env.config"
import { REQUIRED_PERMISSIONS_KEY } from "@/shared/decorators/require-permissions.decorator"

@Injectable()
export class RbacGuard implements CanActivate {
	// Instance logger (not injected) so the guard keeps a zero-dependency
	// constructor. `app.useLogger(nestjs-pino Logger)` in bootstrap.ts routes
	// these lines through Pino, so denials land in the same structured sink as
	// request logs.
	private readonly logger = new Logger(RbacGuard.name)

	constructor(
		private readonly reflector: Reflector,
		private readonly rbacService: RbacService
	) {}

	/**
	 * Record a permission denial so every rejected privileged read/write is
	 * attributable (AZ-1 acceptance: "the denial is auditable").
	 *
	 * Deliberately generic — actor / action / target / outcome — so AZ-4's
	 * append-only `audit_log` helper can adopt this call site without changing
	 * the shape. Logs the handler identity rather than `req.url`: the URL can
	 * carry token-bearing query parameters (see LG-1).
	 */
	private auditDenial(
		context: ExecutionContext,
		actorId: string,
		requiredPermissions: string[],
		missingPermissions?: string[]
	): void {
		this.logger.warn({
			event: "rbac.permission_denied",
			actorId,
			action: `${context.getClass().name}.${context.getHandler().name}`,
			requiredPermissions,
			missingPermissions,
		})
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Handler-level metadata overrides class-level (standard NestJS precedence):
		// a method's @RequirePermissions takes priority over the controller's.
		const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
			REQUIRED_PERMISSIONS_KEY,
			[context.getHandler(), context.getClass()]
		)

		// No decorator applied → guard is inert.
		if (!requiredPermissions || requiredPermissions.length === 0) {
			return true
		}

		// Resolve the authenticated user id from the request.
		//
		// Per the @thallesp/nestjs-better-auth v2.2.0 README ("Request Object
		// Access"), the library's authentication middleware attaches TWO things
		// to the raw request after a session is resolved:
		//   - request.session → the full UserSession ({ user: { id, ... }, session: { ... } })
		//   - request.user    → a direct reference to request.session.user
		//
		// Primary path: request.session?.user?.id — this is the verified shape the
		// @Session() decorator reads in controllers (e.g. todos.controller.ts), so it
		// is the source of truth.
		// Fallback path: request.user?.id — documented direct user reference, tried
		// only if the session object is absent. Defensive hardening against request
		// shape variation across library versions.
		const request = context.switchToHttp().getRequest<{
			headers: IncomingHttpHeaders
			session?: { user?: { id?: string } }
			user?: { id?: string }
		}>()
		let userId: string | undefined = request.session?.user?.id ?? request.user?.id

		// The library's AuthGuard (@thallesp/nestjs-better-auth) attaches
		// request.session in its own canActivate. Global guard execution order is
		// not guaranteed, so RbacGuard may run BEFORE it and see no session. When
		// that happens, resolve the session directly from the request headers (the
		// same mechanism the library uses) and attach it for downstream consumers.
		if (!userId) {
			const session = await getAuth().api.getSession({
				headers: fromNodeHeaders(request.headers),
			})
			if (session) {
				request.session = session
				request.user = session.user
				userId = session.user?.id
			}
		}

		// Fail closed: a protected route without a resolvable session is rejected.
		if (!userId) {
			throw new UnauthorizedException("Authentication required")
		}

		const allowed = await this.rbacService.hasAllPermissions(userId, requiredPermissions)
		if (allowed) {
			return true
		}

		// Verbose in non-production to aid debugging; HttpExceptionFilter surfaces
		// `missingPermissions` as details. Generic message in production.
		// Only report permissions the user actually lacks, not the full required list.
		if (env.NODE_ENV !== "production") {
			const missingPermissions = await this.rbacService.getMissingPermissions(
				userId,
				requiredPermissions
			)
			this.auditDenial(context, userId, requiredPermissions, missingPermissions)
			throw new ForbiddenException({ message: "Forbidden", missingPermissions })
		}

		this.auditDenial(context, userId, requiredPermissions)
		throw new ForbiddenException("Forbidden")
	}
}
