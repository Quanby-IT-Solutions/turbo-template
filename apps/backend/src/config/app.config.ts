import { Logger, type INestApplication } from "@nestjs/common"
import * as express from "express"

import { parseOriginList } from "@repo/auth"

import { env } from "@/config/env.config"

const logger = new Logger("AppConfig")

/**
 * Largest request body the app will parse (AB-4 / F-14).
 *
 * Both parsers were unbounded, so any endpoint would buffer an arbitrarily
 * large body into memory before a single line of application code ran — a
 * memory-exhaustion path on every mutation route.
 *
 * 100kb is far above the largest legitimate payload this app accepts. The
 * biggest is a support ticket's `concern` field, capped at 5000 characters by
 * the contract (HY-2 tightens that cap); even as 4-byte UTF-8 that is ~20kb,
 * leaving room for the rest of the body and generous headroom.
 *
 * Nginx is set to 1m rather than 100kb on purpose: the proxy limit counts the
 * whole request, so matching the two exactly would let header size decide
 * whether a legitimate body is rejected, and by the wrong layer. The gap means
 * oversized junk dies at the edge while borderline requests get a coherent 413
 * from the app.
 */
export const MAX_REQUEST_BODY_SIZE = "100kb"

/**
 * Configure body parser middleware for non-auth routes
 * Note: bodyParser is disabled in bootstrap.ts to allow Better Auth to handle its own body parsing.
 * We need to manually add JSON parsing for all other routes.
 */
function configureBodyParser(app: INestApplication): void {
	const httpAdapter = app.getHttpAdapter()
	httpAdapter.use(express.json({ limit: MAX_REQUEST_BODY_SIZE }))
	httpAdapter.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_BODY_SIZE }))
	logger.log(`Body parser middleware configured (limit: ${MAX_REQUEST_BODY_SIZE})`)
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
	// AC-5 / F-32: the same parser @repo/auth uses for its trusted-origin list,
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
