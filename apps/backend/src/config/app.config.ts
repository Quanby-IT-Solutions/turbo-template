import { Logger, type INestApplication } from "@nestjs/common"
import * as express from "express"

import { env } from "@/config/env.config"

const logger = new Logger("AppConfig")

/**
 * Configure body parser middleware for non-auth routes
 * Note: bodyParser is disabled in bootstrap.ts to allow Better Auth to handle its own body parsing.
 * We need to manually add JSON parsing for all other routes.
 */
function configureBodyParser(app: INestApplication): void {
	const httpAdapter = app.getHttpAdapter()
	httpAdapter.use(express.json())
	httpAdapter.use(express.urlencoded({ extended: true }))
	logger.log("Body parser middleware configured")
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
	const origins = env.CORS_ORIGINS.split(",").map(origin => origin.trim())
	app.enableCors({ origin: origins, credentials: true })
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
