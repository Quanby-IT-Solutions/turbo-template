import { SetMetadata, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

/**
 * Metadata key set by {@link StrictThrottle}. The `strict` named throttler is
 * opt-in: {@link skipStrictThrottle} skips it unless a handler (or its
 * controller) carries this flag.
 */
export const STRICT_THROTTLE_KEY = "throttle:strict-enabled"

const reflector = new Reflector()

/**
 * `skipIf` predicate for the `strict` named throttler.
 *
 * Returns `true` (skip the strict limiter) for every route EXCEPT those
 * explicitly opted in via {@link StrictThrottle}. This keeps read/list/get
 * handlers on the `default` limiter only, so exhausting the strict quota on a
 * mutation never causes 429s on unrelated reads.
 */
export const skipStrictThrottle = (context: ExecutionContext): boolean => {
	const enabled = reflector.getAllAndOverride<boolean>(STRICT_THROTTLE_KEY, [
		context.getHandler(),
		context.getClass(),
	])

	return !enabled
}

/**
 * Opt a mutating route handler into the named `strict` rate limiter.
 *
 * The `strict` throttler is registered with a `skipIf` that disables it by
 * default (see {@link skipStrictThrottle}). This decorator sets the
 * {@link STRICT_THROTTLE_KEY} flag so the strict limiter (with the `ttl` and
 * `limit` configured in `app.module.ts`) is evaluated for this handler only.
 *
 * @example
 * @StrictThrottle()
 * async createTodo() { ... }
 */
export const StrictThrottle = () => SetMetadata(STRICT_THROTTLE_KEY, true)
