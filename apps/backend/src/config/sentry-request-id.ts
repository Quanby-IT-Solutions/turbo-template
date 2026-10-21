import * as Sentry from "@sentry/nestjs"
import type { RequestHandler } from "express"

/**
 * Record the id this server assigned on the request's Sentry isolation scope.
 *
 * Registered immediately after the standalone pino-http middleware: that is the
 * first moment `req.id` exists, including on auth routes that never reach Nest.
 * An event captured while the request is in flight then carries `request_id`,
 * which is the same id the log line prints as `req.id`.
 *
 * No-op when `Sentry.init` never ran. The SDK still has a process-wide isolation
 * scope in that state, and writing the tag there would leak it onto later work.
 */
export const tagAssignedRequestId: RequestHandler = (req, _res, next) => {
	if (Sentry.isInitialized()) {
		const { id } = req
		if (typeof id === "string" && id.length > 0) {
			Sentry.getIsolationScope().setTag("request_id", id)
		} else if (typeof id === "number" && Number.isFinite(id)) {
			Sentry.getIsolationScope().setTag("request_id", String(id))
		}
	}

	next()
}
