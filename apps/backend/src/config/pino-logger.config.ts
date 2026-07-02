import { randomUUID } from "crypto"
import type { IncomingMessage, ServerResponse } from "http"
import type { Options } from "pino-http"

import { env } from "@/config/env.config"

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
		redact: {
			paths: [
				"req.headers.authorization",
				"req.headers.cookie",
				"res.headers['set-cookie']",
				"req.body.password",
				"req.body.*.password",
			],
			remove: true,
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
			const inbound = req.headers["x-request-id"]
			const id =
				(existing != null ? String(existing) : undefined) ||
				(Array.isArray(inbound) ? inbound[0] : inbound) ||
				randomUUID()
			res.setHeader("X-Request-Id", id)
			return id
		},
		customReceivedMessage: req => `--> ${req.method} ${req.url}`,
		customSuccessMessage: (req, res) => `<-- ${req.method} ${req.url} ${res.statusCode}`,
		customErrorMessage: (req, res) => `<-- ${req.method} ${req.url} ${res.statusCode}`,
	}
}
