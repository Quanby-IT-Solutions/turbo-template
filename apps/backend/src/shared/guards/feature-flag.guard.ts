import {
	Injectable,
	NotFoundException,
	UnauthorizedException,
	type CanActivate,
	type ExecutionContext,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { FeatureFlagsService } from "@/common/analytics/feature-flags.service"
import { FEATURE_FLAG_KEY } from "@/shared/decorators/feature-flag.decorator"
import {
	resolveRequestSession,
	type RequestWithSession,
} from "@/shared/guards/resolve-request-session"

/**
 * The guard behind `@FeatureFlag()`.
 *
 * Runs after the global guards, so the session is already resolved; the shared
 * lookup is reused, not repeated. A flag that is off answers 404 rather than
 * 403: a disabled feature should look absent, not forbidden.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly featureFlags: FeatureFlagsService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const key = this.reflector.getAllAndOverride<string | undefined>(FEATURE_FLAG_KEY, [
			context.getHandler(),
			context.getClass(),
		])
		if (!key) return true

		const request = context.switchToHttp().getRequest<RequestWithSession>()
		const userId = (await resolveRequestSession(request))?.user?.id
		if (!userId) throw new UnauthorizedException("Authentication required")

		if (await this.featureFlags.isEnabled(key, userId)) return true
		throw new NotFoundException()
	}
}
