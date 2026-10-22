import {
	ForbiddenException,
	Injectable,
	Logger,
	UnauthorizedException,
	type CanActivate,
	type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { RbacService } from "@/common/rbac/rbac.service"
import { env } from "@/config/env.config"
import { REQUIRED_PERMISSIONS_KEY } from "@/shared/decorators/require-permissions.decorator"
import {
	resolveRequestSession,
	type RequestWithSession,
} from "@/shared/guards/resolve-request-session"

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
	 * attributable (acceptance: "the denial is auditable").
	 *
	 * Deliberately generic — actor / action / target / outcome — so the
	 * append-only `audit_log` helper can adopt this call site without changing
	 * the shape. Logs the handler identity rather than `req.url`: the URL can
	 * carry token-bearing query parameters.
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

		// The user id comes only from the shared verified lookup. When the
		// throttler already resolved this request, that lookup is reused. The
		// helper sets request.session and request.user for later readers.
		const request = context.switchToHttp().getRequest<RequestWithSession>()
		const session = await resolveRequestSession(request)
		const userId = session?.user?.id

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
