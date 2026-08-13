import { randomUUID } from "crypto"
import type { IncomingMessage, ServerResponse } from "http"
import type { Options } from "pino-http"

import { PINO_REDACT_PATHS, sanitizeLogQuery, sanitizeLogUrl } from "@repo/observability"

import { env } from "@/config/env.config"
import { sanitizeRequestId } from "@/utils/log-redaction"

/**
 * Build the shared pino-http options used by BOTH:
 *  - `LoggerModule.forRoot({ pinoHttp })` (provides the injectable Nest `Logger`)
 *  - the standalone `pinoHttp()` Express middleware registered before Better Auth
 *
 * The standalone middleware is the authoritative request/response logger for
 * every route (including auth routes that short-circuit before Nest). To avoid
 * duplicate log lines, `LoggerModule` is wired with `autoLogging: false`.
 */
export function buildPinoHttpOptions(overrides?: { autoLogging?: boolean }): Options {
	const isDevelopment = env.NODE_ENV === "development"

	return {
		// Fallback for when env validation is skipped (e.g. tests), where t3-env
		// returns raw process.env without applying schema defaults.
		level: env.LOG_LEVEL ?? "info",
		autoLogging: overrides?.autoLogging ?? true,
		transport: isDevelopment
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						singleLine: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				}
			: undefined,
		// LG-1 / F-05: logs must be shippable and retainable without becoming a
		// credential store. Everything here is removed outright rather than
		// masked, so no value survives in any sink.
		redact: {
			// Spread: pino types `paths` as a mutable string[], the shared constant
			// is readonly.
			paths: [...PINO_REDACT_PATHS],
			remove: true,
		},
		// `redact` cannot reach the query string, and reset/verification links are
		// `?token=…` URLs. Strip them everywhere the query is emitted: `req.url`,
		// the separately-serialized `req.query` object, and each custom message
		// line below. Sanitizing only the URL leaves the token sitting in
		// `req.query` right beside it.
		serializers: {
			req(req: { url?: string; query?: unknown; [key: string]: unknown }) {
				return {
					...req,
					url: sanitizeLogUrl(req.url),
					query: sanitizeLogQuery(req.query),
				}
			},
		},
		// Request-id resolution order:
		//  1. Reuse an id already attached to `req` by an earlier pino-http instance
		//     (the pre-Better-Auth middleware sets `req.id` first; the Nest-side
		//     LoggerModule middleware must NOT mint a fresh one for the same request).
		//  2. Honor an inbound X-Request-Id header for distributed tracing.
		//  3. Fall back to a freshly minted UUID.
		// Either way, echo the id back on the response so callers can correlate it
		// with the authoritative request/response log line.
		genReqId: (req: IncomingMessage, res: ServerResponse) => {
			// pino-http augments IncomingMessage with `id` (ReqId = string|number|object).
			const existing = (req as { id?: unknown }).id
			// LG-2 / F-37: an inbound id is honoured only when it cannot forge a
			// log line or a response header. Anything else gets a fresh UUID
			// rather than being rejected — a malformed correlation id is not a
			// reason to fail a request.
			const inbound = sanitizeRequestId(req.headers["x-request-id"])
			const id = (existing != null ? String(existing) : undefined) || inbound || randomUUID()
			res.setHeader("X-Request-Id", id)
			return id
		},
		customReceivedMessage: req => `--> ${req.method} ${sanitizeLogUrl(req.url)}`,
		customSuccessMessage: (req, res) =>
			`<-- ${req.method} ${sanitizeLogUrl(req.url)} ${res.statusCode}`,
		customErrorMessage: (req, res) =>
			`<-- ${req.method} ${sanitizeLogUrl(req.url)} ${res.statusCode}`,
	}
}
