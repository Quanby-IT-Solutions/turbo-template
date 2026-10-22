import { Logger, type INestApplication } from "@nestjs/common"
import * as express from "express"

import { parseOriginList } from "@repo/auth"

import { forwardClientParseError } from "@/common/filters/client-request-error"
import { env } from "@/config/env.config"

const logger = new Logger("AppConfig")

/**
 * Largest request body the app will parse.
 *
 * Both parsers were unbounded, so any endpoint would buffer an arbitrarily
 * large body into memory before a single line of application code ran — a
 * memory-exhaustion path on every mutation route.
 *
 * 100kb is far above the largest legitimate payload this app accepts. The
 * biggest is a support ticket's `concern` field, capped at 5000 characters by
 * the contract (the cap is tighter); even as 4-byte UTF-8 that is ~20kb,
 * leaving room for the rest of the body and generous headroom.
 *
 * Nginx is set to 1m rather than 100kb on purpose: the proxy limit counts the
 * whole request, so matching the two exactly would let header size decide
 * whether a legitimate body is rejected, and by the wrong layer. The gap means
 * oversized junk dies at the edge while borderline requests get a coherent 413
 * from the app.
 *
 * The value is a byte count, 100 KiB, which is what `express.json({ limit: "100kb" })`
 * already enforced (`kb` is 1024). The parsers and the auth middleware both
 * read this constant.
 */
export const MAX_REQUEST_BODY_SIZE = 100 * 1024

/**
 * Configure body parser middleware for non-auth routes
 * Note: bodyParser is disabled in bootstrap.ts to allow Better Auth to handle its own body parsing.
 * We need to manually add JSON parsing for all other routes.
 */
function configureBodyParser(app: INestApplication): void {
	const httpAdapter = app.getHttpAdapter()
	httpAdapter.use(express.json({ limit: MAX_REQUEST_BODY_SIZE }))
	httpAdapter.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_BODY_SIZE }))
	// Directly after the parsers. Nest turns a JSON SyntaxError into
	// BadRequestException and keeps the parser message; this hands the filter
	// a plain error that still carries the client status and type.
	httpAdapter.use(forwardClientParseError)
	// 100 KiB. The label stays "100kb" — the same text this line logged when
	// the constant was that string — so a request log never has to carry the
	// raw byte count.
	logger.log("Body parser middleware configured (limit: 100kb)")
}

/**
 * Configure CORS for the application
 *
 * Must run BEFORE Better Auth middleware is registered so that auth routes
 * (/api/v1/auth/*) receive CORS headers and OPTIONS preflight is handled.
 * Express runs middleware in registration order; the auth middleware
 * short-circuits matching requests, so CORS must come first.
 */
export function configureCors(app: INestApplication): void {
	// The same parser @repo/auth uses for its trusted-origin list,
	// so the two allowlists cannot drift. This one trimmed but did not drop
	// empties, so a trailing comma produced an empty origin.
	const origins = parseOriginList(env.CORS_ORIGINS)
	app.enableCors({
		origin: origins,
		credentials: true,
		exposedHeaders: ["Retry-After", "X-Retry-After", "X-Request-Id"],
	})
	logger.log(`CORS enabled for origins: ${origins.join(", ")}`)
}

/**
 * Enable graceful shutdown handlers for SIGTERM and SIGINT signals
 */
function enableGracefulShutdown(app: INestApplication): void {
	const shutdown = async (signal: string): Promise<void> => {
		logger.log(`Received ${signal}, starting graceful shutdown...`)
		try {
			await app.close()
			logger.log("Application closed successfully")
			process.exit(0)
		} catch (error) {
			logger.error("Error during graceful shutdown", error)
			process.exit(1)
		}
	}

	process.on("SIGTERM", () => void shutdown("SIGTERM"))
	process.on("SIGINT", () => void shutdown("SIGINT"))
	logger.log("Graceful shutdown handlers registered")
}

/**
 * Configure all application-level settings
 * Note: Global pipes/interceptors/filters are registered via APP_* providers in app.module.ts
 */
export function configureApp(app: INestApplication): void {
	configureBodyParser(app)
	enableGracefulShutdown(app)
}
